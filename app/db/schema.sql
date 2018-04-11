
DROP DATABASE IF EXISTS Pong2108_db;

CREATE DATABASE Pong2108_db;

USE Pong2108_db;

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS user_account;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS uploads;
DROP TABLE IF EXISTS administrators;
DROP TABLE IF EXISTS audit_log;


CREATE TABLE users (
    user_id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email_hash VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    account_id INT,
    is_this_master_for_acct BOOLEAN,
    primary key (user_id) 
);


CREATE TABLE user_account (
    account_id INT AUTO_INCREMENT,
    max_upload_allow INT,
    curr_num_uploads INT,
    max_device_allow INT,
    max_file_size_allow INT,
    max_numPics_per_session INT,
    date_acct_expire INT(13),
    isActive BOOLEAN,
    allowEmail BOOLEAN,
    wantsEmailToUser BOOLEAN,
    wantsEmailToMaster BOOLEAN,
    PRIMARY KEY (account_id)
);


CREATE TABLE games (
    game_id INT NOT NULL AUTO_INCREMENT,
    player_1_id INT,
    player_1_coord_X INT,
    player_1_coord_Y INT,
    player_1_locat_GPS_lat FLOAT(15,10),
    player_1_locat_GPS_lon FLOAT(15,10),
    player_1_locat_addr VARCHAR(40),
    player_1_hit_time_win FLOAT(10,5),
    player_2_id INT,
    player_2_coord_X INT,
    player_2_coord_Y INT,
    player_2_locat_GPS_lat FLOAT(15,10),
    player_2_locat_GPS_lon FLOAT(15,10),
    player_2_locat_addr VARCHAR(40),
    player_2_hit_time_win FLOAT(10,5),
    field_size_X FLOAT(20,5),
    field_size_Y FLOAT(20,5),
    field_scale_X FLOAT(20,5),
    field_scale_Y FLOAT(20,5),
    dist_players FLOAT(20,5),
    ball_type INT,
    ball_curr_vel INT,
    ball_curr_pos_X FLOAT(15,10),
    ball_curr_pos_Y FLOAT(15,10),
    ball_curr_pos_Z FLOAT(15,10),
    ball_curr_pos_loc_GPS_lat FLOAT(15,10),
    ball_curr_pos_loc_GPS_lon FLOAT(15,10),
    game_speed_up_fact FLOAT(10,5),
    start_time_unix BIGINT(20),
    stop_time_unix BIGINT(20),
    isGameRunning INT,
    PRIMARY KEY (game_id)
);


CREATE TABLE ball_hits (
    ball_hit_id  INT NOT NULL AUTO_INCREMENT,
    game_id INT,
    ball_active INT,
    time_start_unix BIGINT(20),
    time_stop_unix BIGINT(20),
    start_pos_loc_GPS_lat REAL(15,10),
    start_pos_loc_GPS_lon REAL(15,10),
    stop_pos_loc_GPS_lat REAL(15,10),
    stop_pos_loc_GPS_lon REAL(15,10),
    dist_between REAL(20,5),
    type_hit VARCHAR(10),
    result_hit VARCHAR(10),
    player_num INT,
    ball_accel_val FLOAT(10,5),
    ball_accel_tim FLOAT(20,5),
    ball_vel FLOAT(20,5),
    ball_angle FLOAT(10,5),
    speed_up_fact FLOAT(10,5),
    PRIMARY KEY (ball_hit_id)
);



CREATE TABLE ball_pos (
    cur_pos_id  INT NOT NULL AUTO_INCREMENT,
    game_id INT,
    ball_hit_id  INT,
    time_start_str VARCHAR(30),
    time_stop_str VARCHAR(30),
    ball_curr_vel INT,
    ball_curr_pos_X REAL(15,10),
    ball_curr_pos_Y REAL(15,10),
    ball_curr_pos_Z REAL(15,10),
    ball_curr_pos_loc_GPS_lat REAL(15,10),
    ball_curr_pos_loc_GPS_lon REAL(15,10),
    dist_between REAL(20,5),
    dist_play_1  REAL(20,5),
    time_play_1  REAL(10,5),
    dist_play_2  REAL(20,5),
    time_play_2  REAL(10,5),
    ball_accel_val FLOAT(10,5),
    ball_accel_tim FLOAT(20,5),
    ball_vel FLOAT(20,5),
    ball_angle FLOAT(10,5),
    speed_up_fact FLOAT(10,5),
    PRIMARY KEY (cur_pos_id)
);



CREATE TABLE engine_stats (
    engine_stats_id INT NOT NULL AUTO_INCREMENT,
    time_started_unix BIGINT(20),
    time_stopped_unix BIGINT(20),
    samp_time_ball FLOAT(5,2),
    samp_time_sql FLOAT(5,2),
    speed_up_fact FLOAT(5,2),
    isRunning INT,
    PRIMARY KEY (engine_stats_id)
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
    time_stamp BIGINT(20),
    user_name VARCHAR(20),
    user_email VARCHAR(20),
    fault VARCHAR(30),
    browser_id VARCHAR(10),
    ip_addr VARCHAR(10),
    PRIMARY KEY (id)  
);

