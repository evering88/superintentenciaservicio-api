import { jsonResponse } from "./helper";
import { publicacion } from "./schema.js";
import { drizzle } from "drizzle-orm/d1";
import { asc, eq, sql } from "drizzle-orm";

export default {
    async fetch(request, env, ctx) {

        const url = new URL(request.url);
        const db = drizzle(env.DB);

        // Ruta: GET /pvt-publicacion_listar
        if (request.method === 'GET' && url.pathname === '/pvt-publicacion_listar') {
            console.log('Listando publicaciones...');
            const resultado = await db.select().from(publicacion)
                .orderBy(
                    asc(publicacion.categoria),
                    asc(sql`CASE WHEN ${publicacion.sigla} IS NULL THEN 1 ELSE 0 END`),
                    asc(publicacion.sigla)
                ).all();
            
            return jsonResponse(resultado);
        }

        else if (request.method === 'POST' && url.pathname === '/pvt-publicacion_actualizar') {
            const data = await request.json();
            const campos = {
                uat: sql`(cast(unixepoch() * 1000 as integer))`,
            };

            if (data.cantidad !== undefined) {
                campos.cantidad = data.cantidad;
            }

            if (data.cantidadReserva !== undefined) {
                campos.cantidadReserva = data.cantidadReserva;
            }

            try {
                const resultado = await db.update(publicacion)
                    .set(campos)
                    .where(eq(publicacion.id, data.id))
                    .run();

                return jsonResponse('Publicacion '+ data.id +' actualizada');

            } catch (error) {
                console.error('❌ Error actualizando publicaciones:', error);
                return jsonResponse('Error actualizando', 400);
            }
        }

        return new Response('Not found', { status: 404 });
    }
};