
DROP DATABASE IF EXISTS My_Mobi_Linq_db;

CREATE DATABASE My_Mobi_Linq_db;

USE My_Mobi_Linq_db;


CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email_hash VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_id INT,
    is_this_master_for_acct BOOLEAN,
    primary key (user_id) 
);


CREATE TABLE userAccount (
    account_id INT AUTO_INCREMENT,
    max_upload_allow INT,
    curr_num_uploads INT,
    max_device_allow INT,
    max_file_size_allow INT,
    date_acct_expire INT(13),
    isActive BOOLEAN,
    allowEmail BOOLEAN,
    wantsEmailToUser BOOLEAN,
    wantsEmailToMaster BOOLEAN,
    PRIMARY KEY (account_id)
);


CREATE TABLE devices (
    device_id INT NOT NULL AUTO_INCREMENT,
    user_id INT,
    device_name VARCHAR(20),
    isLoggedOn BOOLEAN,
    whatToDisp INT,
    slot_on_scrn INT,
    PRIMARY KEY (device_id)
);


CREATE TABLE uploads (
    upload_id INT NOT NULL AUTO_INCREMENT,
    user_id INT,
    device_id INT,
    filename VARCHAR(20),
    filepathUpload VARCHAR(255),
    destinationDrive VARCHAR(10),
    destinationPath VARCHAR(255),
    complete BOOLEAN DEFAULT false,
    date_start_unix INT(13),
    date_stop_unix INT(13),
    date_email_unit INT(13),
    PRIMARY KEY (upload_id)
);


CREATE TABLE administrators (
    id INT AUTO_INCREMENT,
    adminName_hash VARCHAR(50),
    email_hash VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE audit_log (
    id INT AUTO_INCREMENT,
    typeRec VARCHAR (15),
    time_stamp INT(13),
    user_name VARCHAR(20),
    user_email VARCHAR(20),
    fault VARCHAR(30),
    browser_id VARCHAR(10),
    ip_addr VARCHAR(10),
    PRIMARY KEY (id)  
);

