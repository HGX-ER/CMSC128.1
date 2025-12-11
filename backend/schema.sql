-- schema.sql

DROP DATABASE IF EXISTS testdb;
CREATE DATABASE IF NOT EXISTS testdb;
USE testdb;

-- USERS
CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       role ENUM('nurse','doctor','ed_manager','admin') NOT NULL,
                       full_name VARCHAR(100) DEFAULT NULL,
                       specialty VARCHAR(100) DEFAULT NULL,
                       room VARCHAR(50) DEFAULT NULL,
                       floor VARCHAR(50) DEFAULT NULL,
                       email VARCHAR(255) DEFAULT NULL,
                       phone VARCHAR(50) DEFAULT NULL,
                       status ENUM('active','inactive') DEFAULT 'active',
                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                       updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- PATIENTS
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
) ENGINE=InnoDB;

-- ENCOUNTERS
CREATE TABLE encounters (
                            id INT AUTO_INCREMENT PRIMARY KEY,
                            patient_id INT NOT NULL,
                            queue_number VARCHAR(32) UNIQUE,
                            status VARCHAR(32) NOT NULL DEFAULT 'arrived',
                            priority_esi TINYINT,
                            assigned_doctor VARCHAR(50) NULL,
                            assigned_nurse VARCHAR(50) NULL,
                            arrival_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                            triage_time DATETIME NULL,
                            room_time DATETIME NULL,
                            provider_start_time DATETIME NULL,
                            diagnosis TEXT NULL,
                            disposition VARCHAR(64) NULL,
                            depart_time DATETIME NULL,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            CONSTRAINT fk_enc_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE ON UPDATE CASCADE,
                            CONSTRAINT fk_enc_doctor FOREIGN KEY (assigned_doctor) REFERENCES users(username) ON DELETE SET NULL ON UPDATE CASCADE,
                            CONSTRAINT fk_enc_nurse FOREIGN KEY (assigned_nurse) REFERENCES users(username) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_queue_number ON encounters(queue_number);
CREATE INDEX idx_patient_id ON encounters(patient_id);
CREATE INDEX idx_enc_status ON encounters(status);
CREATE INDEX idx_enc_assigned_doctor ON encounters(assigned_doctor);
CREATE INDEX idx_enc_assigned_nurse ON encounters(assigned_nurse);
CREATE INDEX idx_enc_arrival_time ON encounters(arrival_time);

-- OBSERVATIONS
CREATE TABLE observations (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              encounter_id INT NOT NULL,
                              type ENUM('complaint','temp','hr','rr','bp_sys','bp_dia','spo2') NOT NULL,
                              value VARCHAR(64),
                              unit VARCHAR(16),
                              recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                              CONSTRAINT fk_obs_enc FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_obs_encounter ON observations(encounter_id);

-- ENCOUNTER EVENTS
CREATE TABLE encounter_events (
                                  id INT AUTO_INCREMENT PRIMARY KEY,
                                  encounter_id INT NOT NULL,
                                  type VARCHAR(50) NOT NULL,
                                  at DATETIME NOT NULL,
                                  payload JSON,
                                  CONSTRAINT fk_evt_enc FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_encounter_event ON encounter_events(encounter_id, at);

-- PATIENT FEEDBACK
CREATE TABLE patient_feedback (
                                  id INT AUTO_INCREMENT PRIMARY KEY,
                                  encounter_id INT NOT NULL,
                                  queue_number VARCHAR(32) NOT NULL,
                                  patient_name VARCHAR(100) NULL,
                                  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
                                  comment TEXT,
                                  stage VARCHAR(64) NOT NULL,
                                  stage_display_name VARCHAR(128),
                                  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                  is_read BOOLEAN DEFAULT FALSE,
                                  read_at DATETIME NULL,
                                  CONSTRAINT fk_feedback_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_feedback_queue ON patient_feedback(queue_number);
CREATE INDEX idx_feedback_encounter ON patient_feedback(encounter_id);
CREATE INDEX idx_feedback_submitted ON patient_feedback(submitted_at);
CREATE INDEX idx_feedback_is_read ON patient_feedback(is_read);

-- SEED USERS
INSERT INTO users (username, password, role, full_name, specialty, room, floor, email, phone, status) VALUES
                                                                                                          ('nurse1', '1234', 'nurse', 'Nurse Jane Flores', NULL, NULL, NULL, 'jane.flores@hospital.com', '09171111111', 'active'),
                                                                                                          ('doc1', '1234', 'doctor', 'Dr. Sarah Smith', 'Emergency Medicine', '201', '2nd Floor', 'sarah.smith@hospital.com', '09172222222', 'active'),
                                                                                                          ('doc2', '1234', 'doctor', 'Dr. Becky Jones', 'Emergency Medicine', '201', '2nd Floor', 'becky.jones@hospital.com', '09173333333', 'active'),
                                                                                                          ('manager1', '1234', 'ed_manager', 'ED Manager', NULL, NULL, NULL, 'manager@hospital.com', '09174444444', 'active'),
                                                                                                          ('admin', '1234', 'admin', 'System Administrator', NULL, NULL, NULL, 'admin@hospital.com', '09175555555', 'active')
ON DUPLICATE KEY UPDATE
                     password = VALUES(password),
                     role = VALUES(role),
                     full_name = VALUES(full_name),
                     specialty = VALUES(specialty),
                     room = VALUES(room),
                     floor = VALUES(floor),
                     email = VALUES(email),
                     phone = VALUES(phone),
                     status = VALUES(status);

-- SEED PATIENTS
INSERT INTO patients (full_name, dob, sex, contact_number, emergency_contact, insurance_info, address) VALUES
    ('Juan Dela Cruz', '2001-01-15', 'Male', '09171234567', 'Maria Cruz', 'PhilHealth', 'Manila')
ON DUPLICATE KEY UPDATE
                     full_name = VALUES(full_name),
                     dob = VALUES(dob),
                     sex = VALUES(sex),
                     contact_number = VALUES(contact_number),
                     emergency_contact = VALUES(emergency_contact),
                     insurance_info = VALUES(insurance_info),
                     address = VALUES(address);

-- SEED ENCOUNTERS

-- ICD-10 CODES
CREATE TABLE encounter_icd_codes (
                                     id INT AUTO_INCREMENT PRIMARY KEY,
                                     encounter_id INT NOT NULL,
                                     icd_code VARCHAR(10) NOT NULL,
                                     icd_description TEXT,
                                     recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                     CONSTRAINT fk_icd_encounter FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_icd_encounter ON encounter_icd_codes(encounter_id);
CREATE INDEX idx_icd_code ON encounter_icd_codes(icd_code);

