import { jsonResponse, convertirObjetoABusqueda } from "./helper";
import { casaHermano, manzanaHistorial, noVisitar, territorioPersonalCec } from "./schema.js";
import { drizzle } from "drizzle-orm/d1";
import { max, eq, like, and, notLike, or, isNull, lt, sql } from "drizzle-orm";


export default {
	async fetch(request, env, ctx) {

		const url = new URL(request.url);
		// const db = drizzle(env.DB, { logger: true,});
		const db = drizzle(env.DB);

		// Ruta: GET /pvt-casa_en_casa-info_manzana
		if (request.method === 'GET' && url.pathname === '/pvt-casa_en_casa-info_manzana') {
			let result;
			if (url.searchParams.has('ultima', '1')) {
				result = await db.select({
					id: manzanaHistorial.id,
					completada: max(manzanaHistorial.completada),
					nota: manzanaHistorial.nota,
					publicadorPersonal: territorioPersonalCec.publicador,
					fechaDesdePersonal: territorioPersonalCec.fechaDesde
				})
					.from(manzanaHistorial)
					.leftJoin(territorioPersonalCec, eq(manzanaHistorial.id, territorioPersonalCec.manzanaId))
					.groupBy(manzanaHistorial.id)
					.all();

			} else {
				result = await db.select().from(manzanaHistorial).all();
			}
			return jsonResponse(result);
		}

		// Ruta: POST /pvt-casa_en_casa-info_manzana
		if (request.method === 'POST' && url.pathname === '/pvt-casa_en_casa-info_manzana') {
			const data = await request.json();
			if (!data.manzana_id || !data.completada) {
				console.error('Datos incompletos o incorrectos. Recibido: ', JSON.stringify(data));
				return jsonResponse('Datos incompletos', 400);
			}

			let nota = data.nota || null;

			// Revisar si era territorio personal y eliminarlo si la fecha de completada es posterior a la fechaDesde
			const eraTerritorioPersonal = await db
				.select({ publicador: territorioPersonalCec.publicador })
				.from(territorioPersonalCec)
				.where(and(eq(territorioPersonalCec.manzanaId, data.manzana_id), lt(territorioPersonalCec.fechaDesde, data.completada)))
				.limit(1);

			if (eraTerritorioPersonal.length > 0) {
				await db.delete(territorioPersonalCec).where(eq(territorioPersonalCec.manzanaId, data.manzana_id))
				.then(() => {
					nota = nota ?? `Terr. pers. de ${eraTerritorioPersonal[0].publicador}`;
				});
			}

			// Insertar el historial de la manzana
			await db.insert(manzanaHistorial).values({
				id: data.manzana_id,
				completada: data.completada,
				nota: nota
			})
				.run()
				.catch((e) => {
					console.error('Error al insertar en la base de datos: ', e);
					return jsonResponse('Error interno', 500);
				});

			return jsonResponse('OK');
		}

		// Ruta: POST /pvt-casa_en_casa-asignar_personal
		if (request.method === 'POST' && url.pathname === '/pvt-casa_en_casa-asignar_personal') {
			const data = await request.json();
			if (!data.manzana_id || !data.publicador || !data.fechaDesde) {
				console.error('Datos incompletos o incorrectos. Recibido: ', JSON.stringify(data));
				return jsonResponse('Datos incompletos', 400);
			}

			await db.insert(territorioPersonalCec).values({
				manzanaId: data.manzana_id,
				publicador: data.publicador,
				fechaDesde: data.fechaDesde
			})
				.run()
				.catch((e) => {
					console.error('Error al insertar en la base de datos: ', e);
					return jsonResponse('Error interno', 500);
				});

			return jsonResponse('OK');
		}

		// Ruta: GET /casa_en_casa-casas_hermanos
		if (request.method === 'GET' && url.pathname === '/pvt-casa_en_casa-casas_hermanos') {
			const queryFamilia = url.searchParams.has('familia') ? eq(casaHermano.familia, decodeURIComponent(url.searchParams.get('familia'))) : eq(1,1);
			const queryUsable = url.searchParams.has('usable', '1') ? eq(casaHermano.usable, 1) : eq(1,1);
			
			const result = await db.select()
				.from(casaHermano)
				.where(and(queryFamilia, queryUsable))
				.all();

			return jsonResponse(result);
		}

		// Ruta: GET /casa_en_casa-no_visitar
		if (request.method === 'GET' && url.pathname === '/casa_en_casa-no_visitar') {
			let result;
			if (url.searchParams.has('busqueda')) {
				const busqueda = decodeURIComponent(url.searchParams.get('busqueda'));
				//console.log('Busqueda: '+ busqueda);
				let query = new Object();
				try {
					query = JSON.parse(busqueda);
				} catch (e) {
					query = busqueda;
				}

				let whereClause = null;
				if (typeof query === 'object' && query !== null) {
					//console.log('Objeto:'+ query.toString());
					const queryBusqueda = convertirObjetoABusqueda(noVisitar, query);
					if (queryBusqueda !== null)
						whereClause = and(or(isNull(noVisitar.nota), notLike(noVisitar.nota, 'DRAFT-%')), queryBusqueda);

				} else if (typeof query === 'string') {
					//Probar si el string es divisible
					const partes = query.split(',').map(part => part.trim()).filter(part => part);
					// console.log('Partes: '+ partes);
					if (partes.length > 1) {
						const subQuerys = [];
						partes.forEach(parte => {
							//Procesar un número de terr + letra de manzana
							const numeroYLetras = parte.match(/^(\d{1,2})([a-g]+)$/);
							if (numeroYLetras) {
								const num = parseInt(numeroYLetras[1]);
								if (num >= 1 && num <= 66) {
									const numFormateado = num.toString().padStart(2, '0');
									const letras = numeroYLetras[2].split('');
									// Expandir cada letra
									for (const letra of letras) {
										subQuerys.push(eq(noVisitar.manzanaId, `${numFormateado + letra}`));
									}
								}
							}

							// Procesar solo número de territorio
							const soloNum = parte.match(/^\d{1,2}$/);
							if (soloNum) {
								const num = parseInt(parte);
								if (num >= 1 && num <= 66) {
									subQuerys.push(like(noVisitar.manzanaId, `${parte}%`));
								}
							}
						});

						//console.log('subQuerys: '+ subQuerys);
						whereClause = and(or(isNull(noVisitar.nota), notLike(noVisitar.nota, 'DRAFT-%')), or(...subQuerys));

						//Si es un string simple...
					} else {
						whereClause = and(or(isNull(noVisitar.nota), notLike(noVisitar.nota, 'DRAFT-%')), like(noVisitar.manzanaId, `${query}%`));
					}
				} else if (typeof query === 'number') {
					//console.log('Num simple');
					whereClause = and(or(isNull(noVisitar.nota), notLike(noVisitar.nota, 'DRAFT-%')), like(noVisitar.manzanaId, `${query}%`));
				}

				if (whereClause === null) return jsonResponse([]);

				result = await db.select().from(noVisitar)
					.where(whereClause)
					.orderBy(noVisitar.manzanaId)
					.all();

			} else {
				result = await db.select().from(noVisitar).orderBy(noVisitar.manzanaId).all();
			}

			return jsonResponse(result);
		}

		// Ruta: POST /casa_en_casa-no_visitar
		if (request.method === 'POST' && url.pathname === '/casa_en_casa-no_visitar') {
			const data = await request.json();

			if (!data.manzanaId || !data.direccion || !data.nota) {
				console.error('Datos incompletos o incorrectos. Recibido: ', JSON.stringify(data));
				return jsonResponse('Datos incompletos', 400);
			}

			const ahora = new Date().toISOString().split('T')[0];

			await db.insert(noVisitar).values({
				manzanaId: data.manzanaId.toLowerCase(),
				direccion: data.direccion,
				departamento: data.departamento || null,
				nota: 'DRAFT-' + data.nota,
				ultimaActualizacion: ahora
			})
				.run()
				.catch((e) => {
					console.error('Error al insertar en la base de datos: ', e);
					return jsonResponse('Error interno', 500);
				});

			return jsonResponse('OK');
		}

		//Ruta no encontrada
		return new Response('Not found', { status: 404 });
	}
};