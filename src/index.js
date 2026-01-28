import api_acceso from "./acceso";
import autorizacion from "./autorizacion";
import api_casa_en_casa from "./casa_en_casa";
import api_edificio from "./edificio";
import api_telefonico from "./telefonico";
import api_publicacion from "./publicacion";
import { checkCors } from "./helper";

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const cors = checkCors(request.headers.get("Origin"), env.ALLOWED_ORIGINS, request.method);

		if(cors instanceof Response) {
			console.warn('Respuesta CORS');
			return cors;
		}

		//Endpoints privados
		if (url.pathname.startsWith('/pvt-')) {
			const sesion = await autorizacion.fetch(request, env, ctx);
			console.log('Sesión: ', sesion);
			if (sesion != 'AuthOK') return new Response("No autorizado", { status: 401 });
		}

		//Endpoints públicos y privados
		if (url.pathname.startsWith('/acceder')) {
			return api_acceso.fetch(request, env, ctx);
		}

		if (url.pathname.startsWith('/casa_en_casa') || url.pathname.startsWith('/pvt-casa_en_casa')) {
			return api_casa_en_casa.fetch(request, env, ctx);
		}

		if (url.pathname.startsWith('/edificio') || url.pathname.startsWith('/pvt-edificio')) {
			return api_edificio.fetch(request, env, ctx);
		}

		if (url.pathname.startsWith('/telefonico') || url.pathname.startsWith('/pvt-telefonico')) {
			return api_telefonico.fetch(request, env, ctx);
		}

		if (url.pathname.startsWith('/pvt-publicacion')) {
			return api_publicacion.fetch(request, env, ctx);
		}

		//Ruta no encontrada
		return new Response('Not found', { status: 404 });
	}
};
