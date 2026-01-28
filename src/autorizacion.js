import { drizzle } from "drizzle-orm/d1";
import { sesiones } from "./schema";
import { eq } from "drizzle-orm";

export default {
    async fetch (request, env, ctx) {
        const token = request.headers.get("Authorization")?.replace("Bearer ", "");
        if (!token) return null;
        console.log('Token recibido: ', token);

        const db = drizzle(env.DB);
        const row = await db.select().from(sesiones)
            .where(eq(sesiones.token, token))
            .get();

        if (row && Date.now() - row.creado > 1000*60*60*24*2) { // Expira en 2 días
            await db.delete(sesiones).where(eq(sesiones.token, token)).run();
            return null;
        }

        return 'AuthOK';
    }
};