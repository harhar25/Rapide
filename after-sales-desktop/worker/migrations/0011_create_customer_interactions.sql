-- Create customer_interactions table
CREATE TABLE IF NOT EXISTS customer_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL, -- 'call', 'sms', 'email', 'visit'
    outcome TEXT NOT NULL, -- 'answered', 'no-answer', 'busy', 'scheduled', 'not-interested', 'cb-later'
    notes TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Index for faster lookups by customer
CREATE INDEX IF NOT EXISTS idx_interactions_customer ON customer_interactions(customer_id);
