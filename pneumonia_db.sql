SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE TABLE `prediction_history` (
  `id` int(11) NOT NULL,
  `image_filename` varchar(255) NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `prediction_result` enum('Normal','Pneumonia') NOT NULL,
  `confidence_score` float NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `prediction_history` (`id`, `image_filename`, `image_path`, `prediction_result`, `confidence_score`, `created_at`) VALUES
(50, 'person1946_bacteria_4874.jpeg', 'D:\\deteksi-pneumonia\\backend\\uploads\\1757767000_person1946_bacteria_4874.jpeg', 'Pneumonia', 1, '2025-09-13 12:36:40'),
(51, 'NORMAL2-IM-1427-0001.jpeg', 'D:\\deteksi-pneumonia\\backend\\uploads\\1757767011_NORMAL2-IM-1427-0001.jpeg', 'Normal', 0.997656, '2025-09-13 12:36:51'),
(52, 'NORMAL2-IM-1440-0001.jpeg', 'D:\\deteksi-pneumonia\\backend\\uploads\\1757767172_NORMAL2-IM-1440-0001.jpeg', 'Normal', 0.999793, '2025-09-13 12:39:32'),
(53, 'person1952_bacteria_4883.jpeg', 'D:\\deteksi-pneumonia\\backend\\uploads\\1757767184_person1952_bacteria_4883.jpeg', 'Pneumonia', 1, '2025-09-13 12:39:44'),
(54, 'person1952_bacteria_4883.jpeg', 'D:\\deteksi-pneumonia\\backend\\uploads\\1757767449_person1952_bacteria_4883.jpeg', 'Pneumonia', 1, '2025-09-13 12:44:09');

ALTER TABLE `prediction_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_prediction_result` (`prediction_result`);

ALTER TABLE `prediction_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;
COMMIT;
