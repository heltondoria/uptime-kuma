const fs = require("fs");
const { R } = require("redbean-node");
const { setSetting, setting, } = require("../util-server");
const { debug, sleep } = require("../../src/util");
const knex = require("knex");

/**
 * Database & App Data Folder
 */
class DatabaseMysql {

    /**
     * Data Dir (Default: ./data)
     */
    static dataDir;

    static path;

    /**
     * Host name of the database
     */
    static dbHost;

    /**
     * Port of the database (Default: 3306)
     */
    static dbPort;

    /**
     * DB user of the application
     */
    static dbUser;

    /**
     * DB password
     */
    static dbPass;

    /**
     * Name of the database
     */
    static dbName;

    /**
     * User Upload Dir (Default: ./data/upload)
     */
    static uploadDir;

    /**
     * @type {boolean}
     */
    static patched = false;

    /**
     * For Backup only
     */
    static backupPath = null;

    /**
     * Add patch filename in key
     * Values:
     *      true: Add it regardless of order
     *      false: Do nothing
     *      { parents: []}: Need parents before add it
     */
    static patchList = {
        "patch-initial-schema.sql": true,
    };

    /**
     * The final version should be 10 after merged tag feature
     * @deprecated Use patchList for any new feature
     */
    static latestVersion = 10;

    static noReject = true;

    static init(args) {
        // Data Directory (must be end with "/")
        DatabaseMysql.dataDir = process.env.DATA_DIR || args["data-dir"] || "./data/";
        DatabaseMysql.dbHost = process.env.DB_MYSQL_HOST || "kumadb";
        DatabaseMysql.dbPort = process.env.DB_MYSQL_PORT || "3306";
        DatabaseMysql.dbUser = process.env.DB_MYSQL_USER || "kumadb_user";
        DatabaseMysql.dbPass = process.env.DB_MYSQL_PASSWORD;
        DatabaseMysql.dbName = process.env.DB_MYSQL_DBNAME || "kumadb";

        DatabaseMysql.uploadDir = DatabaseMysql.dataDir + "upload/";

        if (!fs.existsSync(DatabaseMysql.uploadDir)) {
            fs.mkdirSync(DatabaseMysql.uploadDir, { recursive: true });
        }

        console.log(`Data Dir: ${DatabaseMysql.dataDir}`);
    }

    static async connect(testMode = false) {
        const knexInstance = knex({
            client: "mysql",
            connection: {
                host: DatabaseMysql.dbHost,
                port: DatabaseMysql.dbPort,
                user: DatabaseMysql.dbUser,
                password: DatabaseMysql.dbPass,
                database: DatabaseMysql.dbName,
            },
            useNullAsDefault: true,
            pool: {
                min: 2,
                max: 10
            },
        });

        R.setup(knexInstance);

        if (process.env.SQL_LOG === "1") {
            R.debug(true);
        }

        // Auto map the model to a bean object
        R.freeze(true);
        await R.autoloadModels("./server/model");

        console.log("MySQL Version: " + await R.getCell("SELECT VERSION()"));
    }

    static async patch() {
        console.log("Database Patch Process");
        // get a list of patches already applied
        let databasePatchedFiles = await setting("databasePatchedFiles");

        if (!databasePatchedFiles) {
            databasePatchedFiles = {};
        }

        debug("Patched files:");
        debug(databasePatchedFiles);

        try {
            // iterate through the patch list
            for (let sqlFilename in this.patchList) {
                // verify if the patch is already applied
                if (!databasePatchedFiles[sqlFilename]) {
                    console.log("Applying patch " + sqlFilename + "..." )
                    await this.applyPatchFile(sqlFilename, databasePatchedFiles);
                } else {
                    console.log("Patch " + sqlFilename + " already applied. Skipping." )
                }
            }

            if (this.patched) {
                console.log("Database Patched Successfully");
            }

        } catch (ex) {
            await DatabaseMysql.close();

            console.error(ex);
            console.error("Start Uptime-Kuma failed due to issue patching the database");
            console.error("Please submit the bug report if you still encounter the problem after restart: https://github.com/louislam/uptime-kuma/issues");

            process.exit(1);
        }

        // updates the applied patch list
        await setSetting("databasePatchedFiles", databasePatchedFiles);
    }

    /**
     * Special handle, because tarn.js throw a promise reject that cannot be caught
     * @returns {Promise<void>}
     */
    static async close() {
        const listener = (reason, p) => {
            DatabaseMysql.noReject = false;
        };
        process.addListener("unhandledRejection", listener);

        console.log("Closing the database");

        while (true) {
            DatabaseMysql.noReject = true;
            await R.close();
            await sleep(2000);

            if (DatabaseMysql.noReject) {
                break;
            } else {
                console.log("Waiting to close the database");
            }
        }
        console.log("Database connection closed");

        process.removeListener("unhandledRejection", listener);
    }

    static getSize() {
        debug("Database.getSize()");
        let stats = R.exec("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) FROM information_schema.tables WHERE table_schema = 'kumadb' GROUP BY table_schema;");
        debug(stats);
        return stats;
    }

    static async shrink() {
        console.info("Nothing to be done.");
    }

    /**
     * Sadly, multi sql statements is not supported by many sqlite libraries, I have to implement it myself
     * @param filename
     * @returns {Promise<void>}
     */
    static async importSQLFile(filename) {

        await R.getCell("SELECT 1");

        let text = fs.readFileSync(filename).toString();

        // Remove all comments (--)
        let lines = text.split("\n");
        lines = lines.filter((line) => {
            return ! line.startsWith("--");
        });

        // Split statements by semicolon
        // Filter out empty line
        text = lines.join("\n");

        let statements = text.split(";")
            .map((statement) => {
                return statement.trim();
            })
            .filter((statement) => {
                return statement !== "";
            });

        for (let statement of statements) {
            await R.exec(statement);
        }
    }

    static async applyPatchFile(sqlFilename, databasePatchedFiles) {
        try { // apply patch file
            console.log(sqlFilename + " is patching");
            await this.importSQLFile("./db/mysql/" + sqlFilename);
            databasePatchedFiles[sqlFilename] = true;
            this.patched = true;
            console.log(sqlFilename + " was patched successfully");
        } catch (ex) { // apply rollback file of a specific patch
            console.error(ex);
            console.error("Failed to apply patch " + sqlFilename + ". Rolling back.")
            await this.importSQLFile("./db/mysql/rollback/" + sqlFilename);
            databasePatchedFiles[sqlFilename] = false;
            this.patched = false;
        }
    }
}

module.exports = DatabaseMysql;
