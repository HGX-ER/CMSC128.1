DROP DATABASE IF EXISTS testdb;
CREATE DATABASE IF NOT EXISTS testdb;
USE testdb;

CREATE TABLE users (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       role ENUM('nurse','doctor','ed_manager') NOT NULL,
                       full_name VARCHAR(100) DEFAULT NULL,
                       specialty VARCHAR(100) DEFAULT NULL,
                       room VARCHAR(50) DEFAULT NULL,
                       floor VARCHAR(50) DEFAULT NULL
) ENGINE=InnoDB;

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
                            assigned_doctor VARCHAR(50) NULL,
                            assigned_nurse VARCHAR(50) NULL,
                            arrival_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                            triage_time DATETIME NULL,
                            room_time DATETIME NULL,
                            provider_start_time DATETIME NULL,
                            disposition VARCHAR(64) NULL,
                            depart_time DATETIME NULL,
                            CONSTRAINT fk_enc_patient
                                FOREIGN KEY (patient_id) REFERENCES patients(id)
                                    ON DELETE CASCADE ON UPDATE CASCADE,
                            CONSTRAINT fk_enc_doctor
                                FOREIGN KEY (assigned_doctor) REFERENCES users(username)
                                    ON DELETE SET NULL ON UPDATE CASCADE,
                            CONSTRAINT fk_enc_nurse
                                FOREIGN KEY (assigned_nurse) REFERENCES users(username)
                                    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_queue_number ON encounters(queue_number);
CREATE INDEX idx_patient_id ON encounters(patient_id);
CREATE INDEX idx_enc_status ON encounters(status);
CREATE INDEX idx_enc_assigned_doctor ON encounters(assigned_doctor);
CREATE INDEX idx_enc_assigned_nurse ON encounters(assigned_nurse);
CREATE INDEX idx_enc_arrival_time ON encounters(arrival_time);

CREATE TABLE observations (
                              id INT AUTO_INCREMENT PRIMARY KEY,
                              encounter_id INT NOT NULL,
                              type ENUM('complaint','temp','hr','rr','bp_sys','bp_dia','spo2') NOT NULL,
                              value VARCHAR(64),
                              unit VARCHAR(16),
                              recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                              CONSTRAINT fk_obs_enc
                                  FOREIGN KEY (encounter_id) REFERENCES encounters(id)
                                      ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

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
                                  CONSTRAINT fk_evt_enc
                                      FOREIGN KEY (encounter_id) REFERENCES encounters(id)
                                          ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_encounter_event ON encounter_events(encounter_id, at);

INSERT INTO users (username, password, role, full_name, specialty, room, floor) VALUES
                                                                                    ('nurse1','1234','nurse','Nurse Jane Flores',NULL,NULL,NULL),
                                                                                    ('doc1','1234','doctor','Dr. Sarah Smith','Emergency Medicine','201','2nd Floor'),
                                                                                    ('manager1','1234','ed_manager','ED Manager',NULL,NULL,NULL)
ON DUPLICATE KEY UPDATE
                     password=VALUES(password),
                     role=VALUES(role),
                     full_name=VALUES(full_name),
                     specialty=VALUES(specialty),
                     room=VALUES(room),
                     floor=VALUES(floor);

INSERT INTO patients (full_name, dob, sex, contact_number, emergency_contact, insurance_info, address) VALUES
                                                                                                           ('Juan Dela Cruz','2001-01-15','Male','09171234567','Maria Cruz','PhilHealth','Manila'),
                                                                                                           ('Maria Santos','1999-07-20','Female','09181234567','Jose Santos','Maxicare','Quezon City'),
                                                                                                           ('Pedro Gomez','1988-03-10','Male','09191234567','Anna Gomez','Intellicare','Pasig')
ON DUPLICATE KEY UPDATE
                     full_name=VALUES(full_name),
                     dob=VALUES(dob),
                     sex=VALUES(sex),
                     contact_number=VALUES(contact_number),
                     emergency_contact=VALUES(emergency_contact),
                     insurance_info=VALUES(insurance_info),
                     address=VALUES(address);

INSERT INTO encounters (patient_id, queue_number, status, priority_esi, assigned_doctor, assigned_nurse, arrival_time) VALUES
                                                                                                                           (1,'ED001','waiting_doctor',4,'doc1','nurse1',NOW()),
                                                                                                                           (2,'ED002','registered',3,NULL,'nurse1',NOW()),
                                                                                                                           (3,'ED003','arrived',NULL,NULL,'nurse1',NOW())
ON DUPLICATE KEY UPDATE
                     status=VALUES(status),
                     priority_esi=VALUES(priority_esi),
                     assigned_doctor=VALUES(assigned_doctor),
                     assigned_nurse=VALUES(assigned_nurse),
                     arrival_time=VALUES(arrival_time);

INSERT INTO observations (encounter_id, type, value, unit) VALUES
                                                               ((SELECT id FROM encounters WHERE queue_number='ED001'),'complaint','Headache',NULL),
                                                               ((SELECT id FROM encounters WHERE queue_number='ED001'),'bp_sys','130','mmHg'),
                                                               ((SELECT id FROM encounters WHERE queue_number='ED001'),'bp_dia','80','mmHg');
