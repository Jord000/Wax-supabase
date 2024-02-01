import express, {
	NextFunction,
	Request,
	Response,
	Router,
} from "npm:express@4.18.2";
import format from "npm:pg-format";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

//* connection
const db = new Client(Deno.env.get("DB_CONN_STR"));

//* interfaces
interface Review {
	music_id: number;
	username: number;
	rating: number;
	review_title: string | null;
	review_body: string | null;
	created_at?: string;
	review_id?: number;
}

//* models
export const selectReviews = async (id?: string): Promise<Review[]> => {
	const whereClause = id ? `WHERE music_id = '${id}'` : "";

	const formattedQuery = format(
		`SELECT * FROM reviews
    %s
    ORDER BY created_at DESC
    ;`,
		whereClause
	);

	const { rows } = await db.queryObject(formattedQuery);
	return rows as Review[];
};

export const insertReview = async (
	music_id: string,
	username: string,
	rating: number,
	review_title?: string,
	review_body?: string
): Promise<Review[]> => {
	const {
		rows: [review],
	} = await db.queryObject(
		`INSERT INTO reviews (
      music_id,
      username,
      rating,
      review_title,
      review_body,
      created_at
      )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      NOW()
    )
    RETURNING *;`,
		[music_id, username, rating, review_title, review_body]
	);
	return review;
};

export const deleteReview = async (id: string) => {
	const { rows } = await db.queryObject(
		`DELETE FROM reviews
    WHERE review_id = $1
    RETURNING *
    ;`,
		[id]
	);

	if (!rows.length) return Promise.reject({ status: 404, msg: "not found" });
};

//* controllers
const getReviewsById = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	const { music_id } = req.params;
	try {
		await db.connect();
		const reviews = await selectReviews(music_id);
		await db.end();
		res.status(200).send({ reviews });
	} catch (err) {
		next(err);
	}
};

const getAllReviews = async (
	_req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		await db.connect();
		const reviews = await selectReviews();
		await db.end();
		res.status(200).send({ reviews });
	} catch (err) {
		next(err);
	}
};

const postReviewById = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		await db.connect();
		const {
			body: { username, rating, review_title, review_body },
			params: { music_id },
		} = req;

		const review = await insertReview(
			music_id,
			username,
			rating,
			review_title,
			review_body
		);
		await db.end();
		res.status(201).send({ review });
	} catch (err) {
		next(err);
	}
};

const removeReview = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const { review_id } = req.params;
	try {
		await db.connect();
		await deleteReview(review_id);
		await db.end();
		res.status(204).send();
	} catch (err) {
		next(err);
	}
};

//* router
const reviewRouter = Router();

reviewRouter.route("/").get(getAllReviews);

reviewRouter.route("/:music_id").get(getReviewsById).post(postReviewById);

reviewRouter.route("/:review_id").delete(removeReview);

//* listener
const app = express();
app.use(express.json());

app.use("/reviews", reviewRouter);

app.listen(3030);
