let dbType = process.env.DB_DIALECT || "sqlite"
let Database;
console.log("Choosing database concrete implementation");
if (dbType.toLowerCase() === "mysql") {
    Database = require("./database-handler/database-mysql-handler");
    console.log("Mysql implementation was chosen");
} else {
    Database = require("./database-handler/database-sqlite-handler");
    console.log("Sqlite implementation was chosen");
}

module.exports = Database;
