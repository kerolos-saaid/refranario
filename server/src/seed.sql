-- Seed data for Señor Shaعbi

-- Insert sample proverbs
INSERT INTO proverbs (id, spanish, arabic, english, category, note, image, curator, date, bookmarked) VALUES
('1', 'A quien madruga, Dios le ayuda.', 'من جد وجد', 'The early bird catches the worm.', 'Wisdom', 'Un refrán sobre la diligencia y la acción temprana que conduce al éxito.', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', 'A. Al-Fayed', '12th Oct, 2023', 0),
('2', 'Más vale pájaro en mano que ciento volando.', 'عصفور في اليد خير من عشرة على الشجرة', 'A bird in the hand is worth two in the bush.', 'Prudence', 'Este refrán aconseja no arriesgar una ganancia segura por una potencialmente mayor, pero incierta.', 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400', 'A. Al-Fayed', '12th Oct, 2023', 0),
('3', 'El tiempo es oro.', 'الوقت من ذهب', 'Time is money.', 'Time', 'Un refrán universal que enfatiza el valor del tiempo.', 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=400', 'A. Al-Fayed', '12th Oct, 2023', 0),
('4', 'Ojos que no ven, corazón que no siente.', 'بعيد عن العين بعيد عن القلب', 'Out of sight, out of mind.', 'Nature', 'Un refrán sobre la distancia emocional y la conciencia.', 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400', 'A. Al-Fayed', '12th Oct, 2023', 0);

-- Insert default users (password: password123)
INSERT INTO users (username, password) VALUES
('admin', 'password123'),
('user', 'user123');
