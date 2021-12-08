import fs from "fs";

const { R } = require("redbean-node");

export class Database {

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

    static init(args) {}

    static async connect(testMode) {}

    static async patch() {}

    /**
     * Special handle, because tarn.js throw a promise reject that cannot be caught
     * @returns {Promise<void>}
     */
    static async close() {
        const listener = (reason, p) => {
            Database.noReject = false;
        };
        process.addListener("unhandledRejection", listener);

        console.log("Closing the database");

        while (true) {
            Database.noReject = true;
            await R.close();
            await sleep(2000);

            if (Database.noReject) {
                break;
            } else {
                console.log("Waiting to close the database");
            }
        }
        console.log("Database connection closed");

        process.removeListener("unhandledRejection", listener);
    }

    static getSize() {}

    static async shrink() {}

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
}
