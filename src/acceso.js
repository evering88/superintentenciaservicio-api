import { jsonResponse } from "./helper";
import { drizzle } from "drizzle-orm/d1";
import { sesiones } from "./schema";
import { eq } from "drizzle-orm";

export default {
    async fetch(request, env, ctx) {
        const body = await request.json();
        //console.log('Cuerpo de la petición: ', JSON.stringify(body));
        const db = drizzle(env.DB);

        if(body.user && body.pass) {
            const user = body.user;
            const pass = body.pass;

            const row = await db.select().from(sesiones)
                .where(eq(sesiones.user, user))
                .get();

            if (row && Date.now() - row.creado < 1000*60*60*24*2) { // Expira en 2 días
                return jsonResponse({ token: row.token });
            } else {
                await db.delete(sesiones).where(eq(sesiones.user, user)).run();
            }

            const usuarios = (env.USUARIOS_ACCESO ?? "").split(",").map(u => u.trim().toLowerCase());

            if ( user && pass && usuarios.includes(user.toLowerCase()) && pass === env.CLAVE_ACCESO) {
                const token = self.crypto.randomUUID();
                await db.insert(sesiones).values({
                    token: token,
                    user: user,
                    creado: Date.now()
                })
                    .run()
                    .catch((e) => {
                        console.error('Error al insertar en la base de datos: ', e);
                        return jsonResponse('Error interno', 500);
                    });

                return jsonResponse({ token });
            }

        } else if (body.token) {
            const token = body.token;
            const row = await db.select().from(sesiones)
                .where(eq(sesiones.token, token))
                .get();
            if (row && Date.now() - row.creado < 1000*60*60*24*2) { // Expira en 2 días
                return jsonResponse({ status: 'OK' });
            } else {
                await db.delete(sesiones).where(eq(sesiones.token, token)).run();
            }
        }

        
        console.error('Acceso no autorizado para el usuario: ', user, ' con clave: ', pass);
        return new Response("Unauthorized", { status: 401 });
    }
};
