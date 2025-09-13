// models/commentDAO.js
import mongodb from "mongodb";
const ObjectId = mongodb.ObjectId;

let commentsCollection;
let booksCollection;
let usersCollection;

export default class CommentDAO {
  static async injectDB(conn) {
    if (commentsCollection && booksCollection && usersCollection) return;
    try {
      const db = conn.db(process.env.MOVIEREVIEWS_DB_NAME);
      commentsCollection = await db.collection("comments");
      booksCollection = await db.collection("books");
      usersCollection = await db.collection("users");
      // books: cần có field: rating (Number), ratingCount (Number)
    } catch (e) {
      console.error(`Unable to establish collection handles in CommentDAO: ${e}`);
    }
  }

  /**
   * Tạo comment mới (có thể có rating). Sau khi insert, cập nhật Book.rating và Book.ratingCount.
   * data = { id_book, id_user, comment, rating? }
   */
  static async addComment(data) {
    // Validate trước
    if (!data?.id_book || !ObjectId.isValid(data.id_book)) {
      throw new Error("Invalid book id");
    }
    if (!data?.id_user || !ObjectId.isValid(data.id_user)) {
      throw new Error("Invalid user id");
    }
    if (typeof data.comment !== "string" || !data.comment.trim()) {
      throw new Error("Comment is required");
    }

    const userId = new ObjectId(data.id_user);
    const bookId = new ObjectId(data.id_book);

    // Lấy user kèm name/avatar/img để chèn vào comment
    const user = await usersCollection.findOne(
      { _id: userId },
      { projection: { _id: 1, name: 1, avatar: 1, img: 1 } }
    );
    if (!user) throw new Error("User not found");

    // Đảm bảo book tồn tại (giúp transaction fail sớm nếu sai id)
    const book = await booksCollection.findOne(
      { _id: bookId },
      { projection: { _id: 1, rating: 1, ratingCount: 1 } }
    );
    if (!book) throw new Error("Book not found");

    const now = new Date();
    const numericRating = typeof data.rating === "number" ? data.rating : null;

    const doc = {
      id_book: bookId,
      id_user: userId,
      comment: data.comment,
      rating: numericRating,           // có thể null
      createdAt: now,
      updatedAt: now,
      replies: [],
      img: user.img ?? user.avatar ?? null, // ưu tiên img, fallback avatar
      name: user.name ?? null,
    };

    // NOTE: nên start session từ MongoClient (không phải từ collection)
    // giả sử bạn đang có biến `mongoClient` khi injectDB, ở đây dùng tạm cách bạn đang dùng:
    const session = commentsCollection.client.startSession();

    try {
      let insertResult;
      await session.withTransaction(async () => {
        // 1) Insert comment
        insertResult = await commentsCollection.insertOne(doc, { session });

        // 2) Nếu có rating, tăng ratingCount rồi tính lại rating
        if (typeof numericRating === "number") {
          await booksCollection.updateOne(
            { _id: bookId },
            [
              // Tăng count trước & lưu tạm oldCount/oldRating để tính toán
              {
                $set: {
                  _oldCount: { $ifNull: ["$ratingCount", 0] },
                  _oldRating: { $ifNull: ["$rating", 0] },
                  ratingCount: { $add: [{ $ifNull: ["$ratingCount", 0] }, 1] },
                  updatedAt: now,
                },
              },
              // Tính lại rating dựa trên oldCount/oldRating + numericRating, chia cho count mới
              {
                $set: {
                  rating: {
                    $cond: [
                      { $gt: ["$_oldCount", 0] },
                      {
                        $divide: [
                          {
                            $add: [
                              { $multiply: ["$_oldRating", "$_oldCount"] },
                              numericRating,
                            ],
                          },
                          "$ratingCount", // lúc này đã là count mới
                        ],
                      },
                      numericRating, // nếu trước đó chưa có rating nào
                    ],
                  },
                },
              },
              // Dọn field tạm
              { $unset: ["_oldCount", "_oldRating"] },
            ],
            { session }
          );
        }
      });

      return insertResult.insertedId;
    } catch (e) {
      console.error(`addComment failed: ${e}`);
      throw e;
    } finally {
      await session.endSession();
    }
  }


  /**
   * Thêm reply vào một comment
   * replyData = { id_user, reply }
   */
  static async addReply(commentId, replyData) {
    const now = new Date();
    const reply = {
      _id: new ObjectId(),
      id_user: new ObjectId(replyData.id_user),
      reply: replyData.reply,
      createdAt: now,
      updatedAt: now,
    };

    const res = await commentsCollection.updateOne(
      { _id: new ObjectId(commentId) },
      { $push: { replies: reply }, $set: { updatedAt: now } }
    );
    return res.matchedCount > 0 && res.modifiedCount > 0 ? reply._id : null;
  }

  /**
   * Cập nhật comment. Nếu đổi rating thì phải cập nhật Book.rating
   * updates = { comment?, rating? }
   */
  static async updateComment(commentId, updates) {
    const id = new ObjectId(commentId);
    const now = new Date();

    // Lấy comment cũ để biết rating cũ
    const comment = await commentsCollection.findOne({ _id: id });
    if (!comment) throw new Error("Comment not found");

    const session = commentsCollection.client.startSession();
    try {
      await session.withTransaction(async () => {
        // Update nội dung comment
        const $set = { updatedAt: now };
        if (typeof updates.comment === "string") $set.comment = updates.comment;
        if (updates.hasOwnProperty("rating")) {
          $set.rating = typeof updates.rating === "number" ? updates.rating : null;
        }

        const res = await commentsCollection.updateOne(
          { _id: id },
          { $set },
          { session }
        );
        if (res.matchedCount === 0) throw new Error("Update comment failed");

        // Nếu rating thay đổi, cập nhật sách:
        const oldR = typeof comment.rating === "number" ? comment.rating : null;
        const newR = updates.hasOwnProperty("rating")
          ? (typeof updates.rating === "number" ? updates.rating : null)
          : oldR;

        if (oldR !== newR) {
          // 4 trường hợp:
          // 1) null -> number : +1 count, cộng điểm
          // 2) number -> null : -1 count, trừ điểm
          // 3) number -> number : giữ count, thay thế điểm
          // 4) null -> null : không làm gì

          const bookId = comment.id_book;

          if (oldR == null && typeof newR === "number") {
            // thêm rating
            await booksCollection.updateOne(
              { _id: bookId },
              [
                {
                  $set: {
                    rating: {
                      $cond: [
                        { $gt: ["$ratingCount", 0] },
                        {
                          $divide: [
                            { $add: [{ $multiply: ["$rating", "$ratingCount"] }, newR] },
                            { $add: ["$ratingCount", 1] },
                          ],
                        },
                        newR,
                      ],
                    },
                    updatedAt: now,
                  },
                },
                { $set: { ratingCount: { $add: ["$ratingCount", 1] } } },
              ],
              { session }
            );
          } else if (typeof oldR === "number" && newR == null) {
            // bỏ rating
            await booksCollection.updateOne(
              { _id: bookId },
              [
                {
                  $set: {
                    ratingCount: { $max: [{ $add: ["$ratingCount", -1] }, 0] },
                    updatedAt: now,
                  },
                },
                {
                  $set: {
                    rating: {
                      $cond: [
                        { $gt: [{ $max: [{ $add: ["$ratingCount", -0] }, 0] }, 0] }, // dùng giá trị sau bước trên
                        {
                          $let: {
                            vars: {
                              newCount: { $max: [{ $add: ["$ratingCount", 0] }, 0] },
                              newSum: { $subtract: [{ $multiply: ["$rating", "$ratingCount"] }, oldR] },
                            },
                            in: { $divide: ["$$newSum", "$$newCount"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                },
              ],
              { session }
            );
          } else if (typeof oldR === "number" && typeof newR === "number") {
            // thay thế rating: (sum - oldR + newR)/count
            await booksCollection.updateOne(
              { _id: bookId },
              [
                {
                  $set: {
                    rating: {
                      $cond: [
                        { $gt: ["$ratingCount", 0] },
                        {
                          $let: {
                            vars: {
                              sum: { $multiply: ["$rating", "$ratingCount"] },
                              cnt: "$ratingCount",
                            },
                            in: {
                              $divide: [
                                { $add: [{ $subtract: ["$$sum", oldR] }, newR] },
                                "$$cnt",
                              ],
                            },
                          },
                        },
                        newR, // lý thuyết không xảy ra vì count>0
                      ],
                    },
                    updatedAt: now,
                  },
                },
              ],
              { session }
            );
          }
        }
      });

      return true;
    } catch (e) {
      console.error(`updateComment failed: ${e}`);
      throw e;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Xóa comment. Nếu comment có rating, cập nhật lại Book.rating và ratingCount
   */
  static async deleteComment(commentId) {
    const id = new ObjectId(commentId);
    const comment = await commentsCollection.findOne({ _id: id });
    if (!comment) return false;

    const session = commentsCollection.client.startSession();
    const now = new Date();
    try {
      let ok = false;
      await session.withTransaction(async () => {
        const del = await commentsCollection.deleteOne({ _id: id }, { session });
        if (del.deletedCount === 0) throw new Error("Delete comment failed");

        const oldR = typeof comment.rating === "number" ? comment.rating : null;
        if (oldR != null) {
          // giảm count, trừ điểm
          await booksCollection.updateOne(
            { _id: comment.id_book },
            [
              {
                $set: {
                  ratingCount: { $max: [{ $add: ["$ratingCount", -1] }, 0] },
                  updatedAt: now,
                },
              },
              {
                $set: {
                  rating: {
                    $cond: [
                      { $gt: [{ $max: [{ $add: ["$ratingCount", 0] }, 0] }, 0] },
                      {
                        $let: {
                          vars: {
                            newCount: { $max: [{ $add: ["$ratingCount", 0] }, 0] },
                            newSum: { $subtract: [{ $multiply: ["$rating", "$ratingCount"] }, oldR] },
                          },
                          in: { $divide: ["$$newSum", "$$newCount"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              },
            ],
            { session }
          );
        }
        ok = true;
      });

      return ok;
    } catch (e) {
      console.error(`deleteComment failed: ${e}`);
      throw e;
    } finally {
      await session.endSession();
    }
  }

  static async getCommentsByBook(bookId, { page = 1, limit = 10 } = {}) {
    const id = new ObjectId(bookId);
    const skip = (page - 1) * limit;
    const cursor = commentsCollection
      .find({ id_book: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const items = await cursor.toArray();
    const total = await commentsCollection.countDocuments({ id_book: id });
    return { items, total, page, limit };
  }

  static async getCommentById(commentId) {
    return commentsCollection.findOne({ _id: new ObjectId(commentId) });
  }
}
