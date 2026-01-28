import { jsonResponse, convertirObjetoABusqueda } from "./helper";
import { drizzle } from "drizzle-orm/d1";
import { edificio as bd_edificio, departamento as bd_departamento } from "./schema.js";
import { count, eq, inArray } from "drizzle-orm";

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        //const db = drizzle(env.DB);
        const db = drizzle(env.DB, { logger: true,});

        // Ruta: GET /edificio-buscar
        if (request.method === 'GET' && url.pathname === '/edificio-buscar') {
            let edificio, departamentos = null;
            
            if(url.searchParams.has('id')) {
                const id = url.searchParams.get('id');
                edificio = await db.select().from(bd_edificio).where( eq(bd_edificio.id, parseInt(id)) ).limit(1).get();
                if(!edificio) {
                    return jsonResponse('No encontrado', 404);
                }
                

            } else if(url.searchParams.has('query')) {
                const query = decodeURIComponent(url.searchParams.get('query'));
                
                try {
                    const queryJson = JSON.parse(query);
                    //console.log('Query edificio en JSON: ', queryJson);
                    const queryBusqueda = convertirObjetoABusqueda(bd_edificio, queryJson);

                    edificio = await db.select({
                            id: bd_edificio.id, manzanaId: bd_edificio.manzanaId, direccion: bd_edificio.direccion, nombre: bd_edificio.nombre, nota: bd_edificio.nota, cantRecomendada: bd_edificio.cantRecomendada, cantDepartamentos: count(bd_departamento.id)
                        })
                        .from(bd_edificio)
                        .leftJoin(bd_departamento, eq(bd_departamento.edificioId, bd_edificio.id))
                        .groupBy(bd_edificio.id)
                        .where(queryBusqueda)
                        .orderBy(bd_edificio.manzanaId)
                        .all();

                } catch (error) {
                    console.error('Error al parsear query JSON: ', error);
                    return jsonResponse('Error en el formato de búsqueda', 400);
                }

            } else {
                return jsonResponse('Faltan datos de filtrado', 400);
            }

            if(edificio) {
                if(edificio.length > 0) {
                    console.log('Edificios encontrados:', edificio.length);

                    const edificioIds = edificio.map(e => e.id);

                    departamentos = await db.select({
                        id: bd_departamento.id, 
                        edificioId: bd_departamento.edificioId,
                        visitado: bd_departamento.visitado, 
                        nota: bd_departamento.nota
                    })
                        .from(bd_departamento)
                        .where(inArray(bd_departamento.edificioId, edificioIds))
                        .orderBy(bd_departamento.edificioId, bd_departamento.id)
                        .all();

                } else {
                    return jsonResponse([], 200);

                }
            }

            if(edificio && departamentos) {
                // Agrupar departamentos por edificioId
                const deptosPorEdificio = {};
                for(const depto of departamentos) {
                    if(!deptosPorEdificio[depto.edificioId]) {
                        deptosPorEdificio[depto.edificioId] = [];
                    }
                    deptosPorEdificio[depto.edificioId].push({id: depto.id, visitado: depto.visitado, nota: depto.nota});
                }
                // Asignar departamentos a cada edificio
                for(const edif of edificio) {
                    edif.departamentos = deptosPorEdificio[edif.id] || [];
                }

                return jsonResponse(edificio);

            } else
                return jsonResponse([], 200);
                //return new Response('Not found', { status: 404 });
        }

        // Ruta: GET /edificio-asignar
        else if (request.method === 'GET' && url.pathname === '/edificio-asignar') {
            let edificio, departamentos, cant = null;
            
            if(url.searchParams.has('id')) {
                const id = url.searchParams.get('id');
                cant = ( url.searchParams.has('cant') && Number.isNaN(parseInt(url.searchParams.get('cant'))) ) ?
                    parseInt(url.searchParams.get('cant')) : 4;
                edificio = await db.select().from(bd_edificio).where( eq(bd_edificio.id, parseInt(id)) ).get();
                if(!edificio) {
                    return jsonResponse('No encontrado', 404);
                } 
            } else {
                return jsonResponse('Faltan datos de query', 400);
                
            }

            if(edificio) {
                cant = edificio.cantRecomendada || cant || 4; //Primero la reconmendada, luego la solicitada, por último 4

                departamentos = await db.select({
                    id: bd_departamento.id, 
                    edificioId: bd_departamento.edificioId,
                    visitado: bd_departamento.visitado, 
                    nota: bd_departamento.nota
                })
                    .from(bd_departamento)
                    .where(eq (bd_departamento.edificioId, edificio.id) )
                    .orderBy(bd_departamento.visitado)
                    .limit(cant)
                    .all();
                
            }

            if(edificio && departamentos) {
                // Mezclar y asignar departamentos
                departamentos = departamentos.sort(() => Math.random() - 0.5);
                edificio.departamentos_asignados = departamentos;

                return jsonResponse(edificio);

            } else
                return new Response('Not found', { status: 404 });
        }

        //Ruta no encontrada
        return new Response('Not found', { status: 404 });
    }
}
