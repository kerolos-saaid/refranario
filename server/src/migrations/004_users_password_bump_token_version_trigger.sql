CREATE TRIGGER IF NOT EXISTS users_password_bump_token_version
AFTER UPDATE OF password ON users
FOR EACH ROW
WHEN NEW.password <> OLD.password
BEGIN
    UPDATE users
    SET token_version = OLD.token_version + 1
    WHERE id = OLD.id;
END;
