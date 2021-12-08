let dbType = process.env.DB_DIALECT || "sqlite"
let Database;
if (dbType.toLowerCase() === "mysql") {
    Database = require("./database-handler/database-mysql-handler");
} else {
    Database = require("./database-handler/database-sqlite-handler");
}

module.exports = Database;
