import BookDAO from "../models/bookDAO.js";

export default class BookController {
    // POST /books
    static async createBook(req, res) {
        try {
            const { name, detail, link, pdfLink, img, writer } = req.body;

            // validate nhanh gọn
            if (!name || !detail || !writer || !link) {
                return res.status(400).json({ error: "Missing required fields (name, detail, writer, link)" });
            }

            const bookId = await BookDAO.addBook({ name, detail, link, pdfLink, img, writer });
            if (!bookId) return res.status(400).json({ error: "Book creation failed" });

            return res.status(201).json({
                message: "Book created successfully",
                bookId,
                book: { _id: bookId, name, detail, link, pdfLink, img, writer },
            });
        } catch (e) {
            console.error("Create book error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    // GET /books?page=1&limit=10&search=python (search optional)
    static async getBooks(req, res) {
        try {
            let { page = 1, limit = 10, search = "" } = req.query;
            page = Math.max(parseInt(page) || 1, 1);
            limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100); // cap 100

            const skip = (page - 1) * limit;

            const filter = {};
            if (search) {
                // tìm theo name hoặc writer (case-insensitive)
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { writer: { $regex: search, $options: "i" } },
                ];
            }

            const { books, total } = await BookDAO.getBooks({ filter, skip, limit });

            return res.status(200).json({
                total,                  // tổng số bản ghi
                page,
                limit,
                totalPages: Math.max(Math.ceil(total / limit), 1),
                hasPrev: page > 1,
                hasNext: skip + books.length < total,
                count: books.length,    // số bản ghi trang hiện tại
                books,
            });
        } catch (e) {
            console.error("Get books error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }


    // GET /books/:id
    static async getBookById(req, res) {
        try {
            const { id } = req.params;
            const book = await BookDAO.getBookById(id);
            if (!book) return res.status(404).json({ error: "Book not found" });
            return res.status(200).json(book);
        } catch (e) {
            console.error("Get book by ID error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    // PATCH/PUT /books/:id
    static async updateBook(req, res) {
        try {
            const { id } = req.params;
            const { name, detail, link, pdfLink, img, writer } = req.body;

            const updated = await BookDAO.updateBook(id, { name, detail, link, pdfLink, img, writer });
            if (!updated) {
                return res.status(404).json({ error: "Book not found or no changes made" });
            }

            return res.status(200).json({
                message: "Book updated successfully",
                book: { _id: id, name, detail, link, pdfLink, img, writer },
            });
        } catch (e) {
            console.error("Update book error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    // DELETE /books/:id
    static async deleteBook(req, res) {
        try {
            const { id } = req.params;
            const deleted = await BookDAO.deleteBook(id);
            if (!deleted) return res.status(404).json({ error: "Book not found" });

            return res.status(200).json({ message: "Book deleted successfully", bookId: id });
        } catch (e) {
            console.error("Delete book error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    // GET /books/search?query=...&page=1&limit=10
    static async searchBooks(req, res) {
        try {
            const { query, page = 1, limit = 10 } = req.query;
            const pageNum = Math.max(parseInt(page) || 1, 1);
            const lim = Math.max(parseInt(limit) || 10, 1);
            const skip = (pageNum - 1) * lim;

            const filter = {};
            if (query) {
                // tìm trong name/detail/writer và cả link/pdfLink nếu muốn
                filter.$or = [
                    { name: { $regex: query, $options: "i" } },
                    { detail: { $regex: query, $options: "i" } },
                    { writer: { $regex: query, $options: "i" } },
                ];
            }

            const { books, total } = await BookDAO.searchBooks(filter, skip, lim);
            return res.status(200).json({
                page: pageNum,
                limit: lim,
                total,
                pages: Math.ceil(total / lim),
                books,
            });
        } catch (e) {
            console.error("Search books error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    static async incrementView(req, res) {
        try {
            const { id } = req.params;
            const updated = await BookDAO.incrementViewCount(id);
            if (!updated) {
                return res.status(404).json({ error: "Book not found" });
            }
            return res.status(200).json({ message: "View count incremented successfully" });
        } catch (e) {
            console.error("Increment view count error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    static async getTopRatedBooks(req, res) {
        try {
            const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50); // giới hạn tối đa 50
            const books = await BookDAO.getTopRatedBooks(limit);
            return res.status(200).json(books);
        } catch (e) {
            console.error("Get top rated books error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
    static async getTopDayWeekMonthYearBooks(req, res) {
        try {
            const { period, limit } = req.query;
            const books = await BookDAO.getTopDayWeekMonthYearBooks(period, limit);
            return res.status(200).json(books);
        } catch (e) {
            console.error("Get top day/week/month/year books error:", e);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}
