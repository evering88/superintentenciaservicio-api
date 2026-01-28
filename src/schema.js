import { sqliteTable, primaryKey, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

export const sesiones = sqliteTable("sesiones", {
	token: text().primaryKey(),
	user: text().notNull(),
	creado: integer().notNull(),
});

export const manzanaHistorial = sqliteTable("manzana_historial", {
	id: text().notNull(),
	completada: text().notNull(),
	nota: text(),
},
(table) => [
	primaryKey({ columns: [table.id, table.completada], name: "manzana_historial_id_completada_pk"})
]);

export const edificio = sqliteTable("edificio", {
	id: integer().primaryKey().notNull(),
	manzanaId: text("manzana_id").notNull(),
	direccion: text().notNull(),
	nombre: text(),
	nota: text(),
	cantRecomendada: integer("cant_recomendada"),
});

export const departamento = sqliteTable("departamento", {
	edificioId: integer("edificio_id").notNull(),
	id: text().notNull(),
	visitado: text(),
	nota: text(),
},
(table) => [
	primaryKey({ columns: [table.edificioId, table.id], name: "departamento_edificio_id_id_pk"})
]);

export const telefonico = sqliteTable("telefonico", {
	numero: integer().primaryKey(),
	calle: text().notNull(),
	estado: integer().notNull(),
	ultimaVez: text("ultima_vez"),
});

export const casaHermano = sqliteTable("casa_hermano", {
	id: integer().primaryKey().notNull(),
	familia: text().notNull(),
	nombreMostrar: text().notNull(),
	direccion: text().notNull(),
	link: text(),
	usable: integer().notNull(),
	observacion: text(),
});

export const noVisitar = sqliteTable("no_visitar", {
	id: integer().primaryKey(),
	manzanaId: text("manzana_id").notNull(),
	direccion: text().notNull(),
	departamento: text(),
	nota: text(),
	ultimaActualizacion: text("ultima_actualizacion"),
});

export const publicacion = sqliteTable("publicacion", {
	id: integer().primaryKey(),
	categoria: text().notNull(),
	sigla: text(),
	nombre: text().notNull(),
	cantidad: integer().notNull(),
	cantidadReserva: integer("cantidad_reserva").notNull(),
	congregacion: text(),
	uat: integer()
});

export const territorioPersonalCec = sqliteTable("territorio_personal_cec", {
	manzanaId: text("manzana_id").primaryKey().notNull(),
	publicador: text().notNull(),
	fechaDesde: text("fecha_desde").notNull(),
});
