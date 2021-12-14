CREATE TABLE IF NOT EXISTS `group`
(
    id           INT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(255) NOT NULL,
    created_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    public       BOOLEAN      NOT NULL DEFAULT 0,
    active       BOOLEAN      NOT NULL DEFAULT 1,
    weight       INT          NOT NULL DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS incident
(
    id                INT PRIMARY KEY AUTO_INCREMENT,
    title             VARCHAR(255) NOT NULL,
    content           TEXT         NOT NULL,
    style             VARCHAR(30)  NOT NULL DEFAULT 'warning',
    created_date      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_date DATETIME,
    pin               BOOLEAN      NOT NULL DEFAULT 1,
    active            BOOLEAN      NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS setting
(
    id    INT PRIMARY KEY AUTO_INCREMENT,
    `key` VARCHAR(200) NOT NULL UNIQUE,
    value TEXT,
    type  VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS tag
(
    id           INT PRIMARY KEY AUTO_INCREMENT,
    name         VARCHAR(255) NOT NULL,
    color        VARCHAR(255) NOT NULL,
    created_date DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user
(
    id               INT PRIMARY KEY AUTO_INCREMENT,
    username         VARCHAR(255) NOT NULL UNIQUE,
    password         VARCHAR(255),
    active           BOOLEAN      NOT NULL DEFAULT 1,
    timezone         VARCHAR(150),
    twofa_secret     VARCHAR(64),
    twofa_status     BOOLEAN      NOT NULL DEFAULT 0,
    twofa_last_token VARCHAR(6)
);

CREATE TABLE IF NOT EXISTS monitor
(
    id                        INT PRIMARY KEY AUTO_INCREMENT,
    name                      VARCHAR(150),
    active                    BOOLEAN  NOT NULL DEFAULT 1,
    user_id                   INT,
    `interval`                INT      NOT NULL DEFAULT 20,
    url                       TEXT,
    type                      VARCHAR(20),
    weight                    INT               DEFAULT 2000,
    hostname                  VARCHAR(255),
    port                      INT,
    created_date              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    keyword                   VARCHAR(255),
    maxretries                INT      NOT NULL DEFAULT 0,
    ignore_tls                BOOLEAN  NOT NULL DEFAULT 0,
    upside_down               BOOLEAN  NOT NULL DEFAULT 0,
    maxredirects              INT      NOT NULL DEFAULT 10,
    accepted_statuscodes_json TEXT     NOT NULL,
    dns_resolve_type          VARCHAR(5),
    dns_resolve_server        VARCHAR(255),
    dns_last_result           VARCHAR(255),
    push_token                VARCHAR(20)       DEFAULT NULL,
    basic_auth_user           TEXT              DEFAULT NULL,
    basic_auth_pass           TEXT              DEFAULT NULL,
    method                    TEXT     NOT NULL,
    body                      TEXT              DEFAULT NULL,
    headers                   TEXT              DEFAULT NULL,
    retry_interval            INT      NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES user (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notification_sent_history
(
    id         INT PRIMARY KEY AUTO_INCREMENT,
    type       VARCHAR(50) NOT NULL,
    monitor_id INT         NOT NULL,
    days       INT         NOT NULL,
    INDEX good_index(type, monitor_id, days),
    UNIQUE (type, monitor_id, days),
    FOREIGN KEY (monitor_id) REFERENCES monitor (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monitor_tls_info
(
    id         INT PRIMARY KEY AUTO_INCREMENT,
    monitor_id INT NOT NULL,
    info_json  TEXT,
    FOREIGN KEY (monitor_id) REFERENCES monitor (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification
(
    id         INT PRIMARY KEY AUTO_INCREMENT,
    name       VARCHAR(255),
    config     VARCHAR(255),
    active     BOOLEAN NOT NULL DEFAULT 1,
    user_id    INT     NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS heartbeat
(
    id         INT PRIMARY KEY AUTO_INCREMENT,
    important  BOOLEAN  NOT NULL DEFAULT 0,
    monitor_id INT      NOT NULL,
    status     SMALLINT NOT NULL,
    msg        TEXT,
    time       DATETIME NOT NULL,
    ping       INT,
    duration   INT      NOT NULL DEFAULT 0,
    INDEX important(important),
    INDEX monitor_important_time_index(monitor_id, important, time),
    INDEX monitor_time_index(monitor_id, time),
    FOREIGN KEY (monitor_id) REFERENCES monitor (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monitor_group
(
    id         INT PRIMARY KEY AUTO_INCREMENT,
    monitor_id INT     NOT NULL,
    group_id   INT     NOT NULL,
    weight     INT NOT NULL DEFAULT 1000,
    INDEX fk(monitor_id, group_id),
    FOREIGN KEY (monitor_id) REFERENCES monitor (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `group` (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monitor_notification
(
    id              INT PRIMARY KEY AUTO_INCREMENT,
    monitor_id      INT NOT NULL,
    notification_id INT NOT NULL,
    INDEX monitor_notification_index(monitor_id, notification_id),
    FOREIGN KEY (monitor_id) REFERENCES monitor (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES notification (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monitor_tag
(
    id         INT PRIMARY KEY AUTO_INCREMENT,
    monitor_id INT NOT NULL,
    tag_id     INT NOT NULL,
    value      TEXT,
    FOREIGN KEY (monitor_id) REFERENCES monitor (id) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag (id) ON UPDATE CASCADE ON DELETE CASCADE
);
