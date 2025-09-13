import mongodb from "mongodb";
const { ObjectId } = mongodb;

let booksCollection; // handle collection dùng chung

export default class BookDAO {
    static async injectDB(conn) {
        if (booksCollection) return;
        try {
            booksCollection = await conn
                .db(process.env.MOVIEREVIEWS_DB_NAME)
                .collection("books");
            // Index gợi ý: tìm kiếm nhanh theo name / writer
            await booksCollection.createIndex({ name: "text", writer: "text", detail: "text" });
        } catch (e) {
            console.error(`Unable to establish a collection handle in BookDAO: ${e}`);
        }
    }

    static async addBook({ name, detail, link, pdfLink, img, writer }) {
        try {
            const doc = {
                name,
                detail,
                link,
                pdfLink,
                img,
                writer,
                ratingCount: 0,
                rating: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = await booksCollection.insertOne(doc);
            return result.insertedId;
        } catch (e) {
            console.error(`Unable to add book: ${e}`);
            throw e;
        }
    }

    static async updateRatingBook(bookId, rating) {
        try {
            const id = new ObjectId(bookId);
            const book = await booksCollection.findOne({ _id: id });
            if (!book) throw new Error("Book not found");

            const oldRating = book.rating || 0;
            const ratingCount = book.ratingCount || 0;

            // Tính trung bình mới
            const newRating = ((oldRating * ratingCount) + rating) / (ratingCount + 1);

            const result = await booksCollection.updateOne(
                { _id: id },
                {
                    $set: { rating: newRating, updatedAt: new Date() },
                    $inc: { ratingCount: 1 } // tăng số lượt đánh giá
                }
            );

            return result.matchedCount > 0 && result.modifiedCount > 0;
        } catch (e) {
            console.error(`Unable to rate book: ${e}`);
            throw e;
        }
    }


    // static async getBooks({ filter = {}, skip = 0, limit = 10 }) {
    //     try {
    //         const [total, books] = await Promise.all([
    //             booksCollection.countDocuments(filter),
    //             booksCollection
    //                 .find(filter)
    //                 .sort({ updatedAt: -1, _id: -1 }) // mới nhất trước
    //                 .skip(skip)
    //                 .limit(limit)
    //                 .toArray(),
    //         ]);
    //         return { total, books };
    //     } catch (e) {
    //         console.error(`Unable to get books: ${e}`);
    //         throw e;
    //     }
    // }
    static async getBooks() {
        try {
            const books = await booksCollection.find({}).toArray();
            return books;
        } catch (e) {
            console.error(`Unable to get books: ${e}`);
            throw e;
        }
    }

    static async getBookById(bookId) {
        try {
            const id = new ObjectId(bookId);
            return await booksCollection.findOne({ _id: id });
        } catch (e) {
            console.error(`Unable to get book by id: ${e}`);
            throw e;
        }
    }

    static async updateBook(bookId, { name, detail, link, pdfLink, img, writer }) {
        try {
            const id = new ObjectId(bookId);
            const result = await booksCollection.updateOne(
                { _id: id },
                {
                    $set: {
                        name,
                        detail,
                        link,
                        pdfLink,
                        img,
                        writer,
                        updatedAt: new Date(),
                    },
                }
            );
            return result.matchedCount > 0 && result.modifiedCount > 0;
        } catch (e) {
            console.error(`Unable to update book: ${e}`);
            throw e;
        }
    }

    static async deleteBook(bookId) {
        try {
            const id = new ObjectId(bookId);
            const result = await booksCollection.deleteOne({ _id: id });
            return result.deletedCount > 0;
        } catch (e) {
            console.error(`Unable to delete book: ${e}`);
            throw e;
        }
    }

    static async searchBooks(filter = {}, skip = 0, limit = 10) {
        try {
            const cursor = booksCollection.find(filter).skip(skip).limit(limit);
            const books = await cursor.toArray();
            const total = await booksCollection.countDocuments(filter);
            return { books, total };
        } catch (e) {
            console.error(`Unable to search books: ${e}`);
            throw e;
        }
    }
    static async incrementViewCount(bookId) {
        try {
            const id = new ObjectId(bookId);
            const result = await booksCollection.updateOne(
                { _id: id },
                { $inc: { viewCount: 1 } }
            );
            return result.matchedCount > 0 && result.modifiedCount > 0;
        } catch (e) {
            console.error(`Unable to increment view count: ${e}`);
            throw e;
        }
    }
    static async getTopViewedBooks(limit = 10) {
        try {
            const books = await booksCollection
                .find({})
                .sort({ viewCount: -1 })
                .limit(limit)
                .toArray();
            return books;
        } catch (e) {
            console.error(`Unable to get top viewed books: ${e}`);
            throw e;
        }
    }
    static async getTopDayWeekMonthYearBooks(period = 'day', limit = 10) {
        try {
            const now = new Date();
            let startDate; // Ngày bắt đầu của khoảng thời gian

            switch (period) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                    break;
                default:
                    throw new Error(`Invalid period: ${period}`);
            }        // Giả sử có trường updatedAt để xác định thời gian cập nhật gần đây
            const books = await booksCollection
                .find({ rating: { $gt: 0 } })
                .sort({ rating: -1 })
                .limit(limit)
                .toArray();
            return books;
        } catch (e) {
            console.error(`Unable to get top ${period} books: ${e}`);
            throw e;
        }
    }
}
