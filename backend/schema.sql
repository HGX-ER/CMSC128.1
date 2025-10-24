DROP DATABASE IF EXISTS testdb;
CREATE DATABASE IF NOT EXISTS testdb;
USE testdb;

CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       role ENUM('nurse', 'doctor', 'ed_manager') NOT NULL
);

CREATE TABLE patients (
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

CREATE TABLE encounters (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            patient_id INT NOT NULL,
                            queue_number VARCHAR(32) UNIQUE,
                            status ENUM(
                                'arrived',
                                'registered',
                                'triaged',
                                'waiting_doctor',
                                'consultation',
                                'dispositioned',
                                'departed'
                                ) NOT NULL DEFAULT 'arrived',
                            priority_esi TINYINT,
                            assigned_doctor VARCHAR(64),
                            arrival_time DATETIME,
                            triage_time DATETIME,
                            room_time DATETIME,
                            provider_start_time DATETIME,
                            disposition VARCHAR(64),
                            depart_time DATETIME,
                            CONSTRAINT fk_enc_patient FOREIGN KEY (patient_id)
                                REFERENCES patients(id)
                                ON DELETE CASCADE
                                ON UPDATE CASCADE
);

CREATE INDEX idx_queue_number ON encounters (queue_number);
CREATE INDEX idx_patient_id ON encounters (patient_id);

CREATE TABLE observations (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              encounter_id INT NOT NULL,
                              type ENUM('complaint', 'temp', 'hr', 'rr', 'bp_sys', 'bp_dia', 'spo2') NOT NULL,
                              value VARCHAR(64),
                              unit VARCHAR(16),
                              recorded_at DATETIME,
                              CONSTRAINT fk_obs_enc FOREIGN KEY (encounter_id)
                                  REFERENCES encounters(id)
                                  ON DELETE CASCADE
                                  ON UPDATE CASCADE
);

CREATE TABLE encounter_events (
                                  id INT AUTO_INCREMENT PRIMARY KEY,
                                  encounter_id INT NOT NULL,
                                  type ENUM(
                                      'arrived',
                                      'registered',
                                      'triaged',
                                      'roomed',
                                      'provider_started',
                                      'results_ready',
                                      'dispositioned',
                                      'departed'
                                      ) NOT NULL,
                                  at DATETIME NOT NULL,
                                  payload JSON,
                                  CONSTRAINT fk_evt_enc FOREIGN KEY (encounter_id)
                                      REFERENCES encounters(id)
                                      ON DELETE CASCADE
                                      ON UPDATE CASCADE,
                                  INDEX idx_encounter_event (encounter_id, at)
);

INSERT INTO users (username, password, role) VALUES
                                                 ('nurse1', '1234', 'nurse'),
                                                 ('doc1', '1234', 'doctor'),
                                                 ('manager1', '1234', 'ed_manager')
ON DUPLICATE KEY UPDATE
                     password = VALUES(password),
                     role = VALUES(role);

INSERT INTO patients (full_name, dob, sex, contact_number, emergency_contact, insurance_info, address)
VALUES
    ('Juan Dela Cruz', '2001-01-15', 'Male', '09171234567', 'Maria Cruz', 'PhilHealth', 'Manila'),
    ('Maria Santos', '1999-07-20', 'Female', '09181234567', 'Jose Santos', 'Maxicare', 'Quezon City'),
    ('Pedro Gomez', '1988-03-10', 'Male', '09191234567', 'Anna Gomez', 'Intellicare', 'Pasig');

INSERT INTO encounters (patient_id, queue_number, status, priority_esi, assigned_doctor, arrival_time)
VALUES
    (1, 'ED001', 'waiting_doctor', 4, NULL, NOW()),
    (2, 'ED002', 'registered', 3, NULL, NOW()),
    (3, 'ED003', 'arrived', NULL, NULL, NOW());
