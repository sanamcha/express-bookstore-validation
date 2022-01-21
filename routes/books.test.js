
process.env.NODE_ENV = "test";

const app = require("../app");
const db = require("../db");
const request = require("supertest");


let test_isbn;

beforeEach(async () => {
	let book = await db.query(`
        INSERT INTO books (isbn, amazon_url, author, language, pages, publisher, title, year)
        VALUES (
            '1122334455',
            'https://amazon.com/testing',
            'Sammy Tammy',
            'Spanish',
            100,
            'Test Publishing',
            'Testing Book',
            2020
        )
        RETURNING isbn`);
	test_isbn = book.rows[0].isbn;
});

afterEach(async () => {
	await db.query(`DELETE FROM books`);
});
afterAll(async () => {
	await db.end();
});

describe('GET /books', () => {
	test('it should get list of all books', async () => {
		const resp = await request(app).get('/books');

		const { books } = resp.body;
		expect(books).toHaveLength(1);
		expect(books[0]).toHaveProperty('isbn');
		expect(books[0]).toHaveProperty('amazon_url');
	});
});

describe('GET /books/:isbn', () => {
	test('it should get single book', async () => {
		const resp = await request(app).get(`/books/${test_isbn}`);
		expect(resp.body.book).toHaveProperty('isbn');
		expect(resp.body.book.isbn).toBe(test_isbn);
	});

	test('it should return 404 with invalid isbn', async () => {
		const resp = await request(app).get(`/books/11111`);
		expect(resp.statusCode).toBe(404);
	});
});

describe('POST /books', () => {
	test('it should create books ', async () => {
		const resp = await request(app).post('/books').send({
			isbn       : '1212121212',
			amazon_url : 'https://testbook.com',
			author     : 'Test Author',
			language   : 'germany',
			pages      : 200,
			publisher  : 'Test Publisher',
			title      : 'Test title',
			year       : 2000
		});

		expect(resp.statusCode).toBe(201);
		expect(resp.body.book).toHaveProperty('isbn');
	});
	test('prevent creation with invalid or incomplete data', async () => {
		const resp = await request(app).post('/books').send({ title: 'testing title' });
		expect(resp.statusCode).toBe(400);
	});
});

describe('PUT /books/:isbn', () => {
	test('successfully updates book', async () => {
		const resp = await request(app).put(`/books/${test_isbn}`).send({
			amazon_url : 'https://testbook.com',
			author     : 'Test Author',
			language   : 'germany',
			pages      : 150,
			publisher  : 'Test publisher',
			title      : 'Test Title',
			year       : 2000
		});
		expect(resp.statusCode).toBe(200);
		expect(resp.body.book).toHaveProperty('isbn');
		expect(resp.body.book.title).toBe('Test Title');
	});
	test('return 404 if bad isbn', async () => {
		const resp = await request(app).put(`/books/11111`).send({
			amazon_url : 'https://testbook.com',
			author     : 'Test Author',
			language   : 'germany',
			pages      : 200,
			publisher  : 'Test publisher',
			title      : 'Test Title',
			year       : 2000
		});
		expect(resp.statusCode).toBe(404);
	});
	test('it should prevent creation if isbn already exist', async () => {
		const resp = await request(app).put(`/books/${test_isbn}`).send({
			isbn       : test_isbn,
			amazon_url : 'https://testbook.com',
			author     : 'Test Author',
			language   : 'germany',
			pages      : 200,
			publisher  : 'Test publisher',
			title      : 'Test Title',
			year       : 2000
		});

		expect(resp.statusCode).toBe(400);
	});
	test('it should stop creation with missing data in the body', async () => {
		const resp = await request(app).put(`/books/${test_isbn}`).send({
			title : 'Missing'
		});
		expect(resp.statusCode).toBe(400);
	});
});

describe('DELETE /books/:isbn', () => {
	test('it should delete book', async () => {
		const resp = await request(app).delete(`/books/${test_isbn}`);
		expect(resp.body).toHaveProperty('message');
		expect(resp.body.message).toBe('Book deleted');
	});
	test('return 404 if bad isbn', async () => {
		const resp = await request(app).delete(`/books/11111`);
		expect(resp.statusCode).toBe(404);
	});
});