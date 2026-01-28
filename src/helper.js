import { and, eq, like, or, SQL } from "drizzle-orm";

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept'
        }
    });
}

export function checkCors(origen, permitidos, metodo) {
	const origenPermitido = permitidos.includes(origen);
	
	if(!origenPermitido) {
		console.error('CORS rechazado para el origen: ', origen);
		return new Response('CORS rechazado', { status: 403 });
	}

	const headers = origenPermitido ? cabecerasCors(origen) : {};

	// CORS preflight
	if (metodo === 'OPTIONS') {
		return new Response(null, {
			status: origenPermitido ? 204 : 403,
			headers
		});
	} else {
		return true;
	}
}

function cabecerasCors(origen) {
	return {
		"Access-Control-Allow-Origin": origen,
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Access-Control-Allow-Origin",
	};
}


/**
 * Convierte un objeto en una query SQL
 *
 * @export
 * @param {string} tabla 
 * @param {Object} query 
 * @param {string} [comparacion='AND'] 
 * @returns {SQL|null} 
 */
export function convertirObjetoABusqueda(tabla, query, comparacion = 'AND') {
	console.log('Convertir a búsqueda: ', query);
	//console.log('Columnas disponibles: ', Object.keys(tabla));
	const condiciones = [];

	for (const [indice, valor] of Object.entries(query)) {
		//console.log('Elemento indice: '+ indice +' valor: '+ valor);
		console.log(`Procesando - indice: "${indice}", valor: "${valor}", tipo: ${typeof valor}`);
    	console.log(`Columna tabla[${indice}]:`, tabla[indice]);

		if ((typeof valor === 'string' && valor.length > 0) || (typeof valor === 'number')) {
			if(valor.includes(',')) { // Valores múltiples
				const valores = valor.split(',').map(v => v.trim()).filter(v => v);
				const condicionesSub = [];

				valores.forEach( val => {
					if( val.includes('*')) {
					console.log('Usando LIKE');
					condicionesSub.push(like(tabla[indice], `${val.replaceAll(/\*/g, '%')}`));

					} else {
						console.log('Usando EQ');
						condicionesSub.push(eq(tabla[indice], val));
					}
				});
				
				if(condicionesSub.length > 0) {
					condiciones.push( or(...condicionesSub) );
				}

			} else { // Valor simple
				if( valor.includes('*')) {
					console.log('Usando LIKE');
					condiciones.push(like(tabla[indice], `${valor.replaceAll(/\*/g, '%')}`));
	
				} else {
					console.log('Usando EQ');
					condiciones.push(eq(tabla[indice], valor));
				}
			}

		}
	}

	// console.table(condiciones);
	console.log('Condiciones creadas:', condiciones.length);

	if (condiciones.length === 0) {
		return null;
	} else if (condiciones.length === 1) {
		return condiciones[0];
	} else {
		if(comparacion === 'OR')
			return or(...condiciones);
		else
			return and(...condiciones);
	}
}
