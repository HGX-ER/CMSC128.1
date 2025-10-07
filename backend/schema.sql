CREATE DATABASE IF NOT EXISTS testdb;
USE testdb;

CREATE TABLE IF NOT EXISTS users (
                                     id INT AUTO_INCREMENT PRIMARY KEY,
                                     username VARCHAR(50) NOT NULL UNIQUE,
                                     password VARCHAR(255) NOT NULL,
                                     role ENUM('nurse','doctor','ed_manager') NOT NULL
);

CREATE TABLE IF NOT EXISTS patients (
                                        id INT AUTO_INCREMENT PRIMARY KEY,
                                        mrn VARCHAR(32) UNIQUE,
                                        full_name VARCHAR(100) NOT NULL,
                                        dob DATE,
                                        sex VARCHAR(10),
                                        contact_number VARCHAR(32),
                                        emergency_contact VARCHAR(64),
                                        insurance_info VARCHAR(64),
                                        address VARCHAR(128),
                                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encounters (
                                          id INT AUTO_INCREMENT PRIMARY KEY,
                                          patient_id INT NOT NULL,
                                          queue_number VARCHAR(32) UNIQUE, -- ✅ changed from 12 → 32
                                          status ENUM('arrived','registered','triaged','roomed','provider_started','dispositioned','departed') NOT NULL DEFAULT 'arrived',
                                          priority_esi TINYINT,
                                          arrival_time DATETIME,
                                          triage_time DATETIME,
                                          room_time DATETIME,
                                          provider_start_time DATETIME,
                                          disposition VARCHAR(64),
                                          depart_time DATETIME,
                                          CONSTRAINT fk_enc_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE IF NOT EXISTS observations (
                                            id INT AUTO_INCREMENT PRIMARY KEY,
                                            encounter_id INT NOT NULL,
                                            type ENUM('complaint','temp','hr','rr','bp_sys','bp_dia','spo2') NOT NULL,
                                            value VARCHAR(64),
                                            unit VARCHAR(16),
                                            recorded_at DATETIME,
                                            CONSTRAINT fk_obs_enc FOREIGN KEY (encounter_id) REFERENCES encounters(id)
);

CREATE TABLE IF NOT EXISTS encounter_events (
                                                id INT AUTO_INCREMENT PRIMARY KEY,
                                                encounter_id INT NOT NULL,
                                                type ENUM('arrived','registered','triaged','roomed','provider_started','results_ready','dispositioned','departed') NOT NULL,
                                                at DATETIME NOT NULL,
                                                payload JSON,
                                                CONSTRAINT fk_evt_enc FOREIGN KEY (encounter_id) REFERENCES encounters(id),
                                                INDEX (encounter_id, at)
);

INSERT INTO users (username, password, role) VALUES
                                                 ('nurse1','1234','nurse'),
                                                 ('doc1','1234','doctor'),
                                                 ('manager1','1234','ed_manager')
ON DUPLICATE KEY UPDATE password=VALUES(password), role=VALUES(role);

