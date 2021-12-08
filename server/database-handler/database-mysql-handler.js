const fs = require("fs");
const { R } = require("redbean-node");
const {
    setSetting,
    setting,
} = require("../util-server");
const {
    debug,
} = require("../../src/util");
const knex = require("knex");
const { Database } = require("./database");

/**
 * Database & App Data Folder
 */
class DatabaseMysql extends Database {

    /**
     * Data Dir (Default: ./data)
     */
    static dataDir;

    static path;

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
        Database.dataDir = process.env.DATA_DIR || args["data-dir"] || "./data/";
        Database.dbHost = process.env.DB_MYSQL_HOSTS || "kumadb";
        Database.dbPort = process.env.DB_MYSQL_PORT || "3306";
        Database.dbUser = process.env.DB_MYSQL_USER || "kumadb_user";
        Database.dbPass = process.env.DB_MYSQL_PASSWORD;
        Database.dbName = process.env.DB_MYSQL_DBNAME || "kumadb";

        Database.uploadDir = Database.dataDir + "upload/";

        if (!fs.existsSync(Database.uploadDir)) {
            fs.mkdirSync(Database.uploadDir, { recursive: true });
        }

        console.log(`Data Dir: ${Database.dataDir}`);
    }

    static async connect(testMode = false) {
        const acquireConnectionTimeout = 120 * 1000;

        const knexInstance = knex({
            client: "mysql",
            connection: {
                host: Database.dbHost,
                port: Database.dbPort,
                user: Database.dbUser,
                password: Database.dbPass,
                database: Database.dbName,
            },
            useNullAsDefault: true,
            pool: {
                min: 2,
                max: 10,
                idleTimeoutMillis: 120 * 1000,
                propagateCreateError: false,
                acquireTimeoutMillis: acquireConnectionTimeout,
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
            await Database.close();

            console.error(ex);
            console.error("Start Uptime-Kuma failed due to issue patching the database");
            console.error("Please submit the bug report if you still encounter the problem after restart: https://github.com/louislam/uptime-kuma/issues");

            process.exit(1);
        }

        // updates the applied patch list
        await setSetting("databasePatchedFiles", databasePatchedFiles);
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
