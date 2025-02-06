import pg from "pg"

const db= new pg.Client({
    user:process.env.PG_USER,
    password:String(process.env.PG_PASS),
    database:process.env.PG_DATABASE,
    host:process.env.PG_HOST,
    port:process.env.PG_PORT,
})

export default db;


