CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager VARCHAR(255),
  sprint_length INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW()
);
