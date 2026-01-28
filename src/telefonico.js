import { between, eq, gte, lte, asc, sql } from "drizzle-orm";
import { jsonResponse } from "./helper";
import { telefonico } from "./schema.js";
import { drizzle } from "drizzle-orm/d1";

export default {
    async fetch(request, env, ctx) {

        const url = new URL(request.url);
        const db = drizzle(env.DB);

        // Ruta: GET /telefonico-territorio
        if (request.method === 'GET' && url.pathname === '/telefonico-territorio') {
            const cantSolicitada = ( url.searchParams.has('cant') && Number.isNaN(parseInt(url.searchParams.get('cant'))) )
            ?
            parseInt(url.searchParams.get('cant')) : 10;

            const setProbable = await db.select()
                .from(telefonico)
                .where(gte(telefonico.estado, 8))
                .orderBy(
                    asc(sql`CASE WHEN ${telefonico.ultimaVez} IS NULL THEN 0 ELSE 1 END`), // NULL primero
                    asc(telefonico.ultimaVez) // luego los más antiguos
                )
                .limit( Math.floor(0.2 * cantSolicitada) ); //20% del total

            const setDudoso = await db.select()
                .from(telefonico)
                .where(between(telefonico.estado, 4, 7))
                .orderBy(
                    asc(sql`CASE WHEN ${telefonico.ultimaVez} IS NULL THEN 0 ELSE 1 END`), // NULL primero
                    asc(telefonico.ultimaVez) // luego los más antiguos
                )
                .limit( Math.floor(0.6 * cantSolicitada) ); //60% del total

            const setMalo = await db.select()
                .from(telefonico)
                .where(lte(telefonico.estado, 3))
                .orderBy(
                    asc(sql`CASE WHEN ${telefonico.ultimaVez} IS NULL THEN 0 ELSE 1 END`), // NULL primero
                    asc(telefonico.ultimaVez) // luego los más antiguos
                )
                .limit( Math.floor(0.2 * cantSolicitada) ); //20% del total
            
            const resultado = [...setProbable, ...setDudoso, ...setMalo];
            const resultado_mezclado = resultado.sort(() => Math.random() - 0.5);
            
            return jsonResponse(resultado_mezclado);
        }

        // Ruta: POST /telefonico-territorio
        if (request.method === 'POST' && url.pathname === '/telefonico-territorio') {
			const data = await request.json();
            const fecha = new Date().toISOString().split('T')[0];
            
            try {
                const updates = data.map(registro => {
                    db.update(telefonico)
                        .set({
                            estado: registro.estado,
                            notas: registro.notas || null,
                            ...(registro.ultimaVez !== null && {ultimaVez: registro.ultimaVez}) //Si lo primero es true, entra lo segundo
                        })
                        .where(eq(telefonico.numero, registro.numero));
                });

                const resultado = await db.batch(updates);
                return jsonResponse(resultado.length +' registros actualizados');

            } catch (error) {
                console.error('❌ Error actualizando teléfonos:', error);
                return jsonResponse('Error actualizando', 400);
            }
        }
    }
}