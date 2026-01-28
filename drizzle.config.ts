import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: process.env.CF_DB_ID!,
		token: process.env.CF_TOKEN!,
	},
} satisfies Config;
