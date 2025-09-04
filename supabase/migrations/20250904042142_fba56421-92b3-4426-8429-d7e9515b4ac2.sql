-- Insert demo data only if tables exist and are empty
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vy_org') THEN
        INSERT INTO vy_org (id, name) VALUES 
        ('550e8400-e29b-41d4-a716-446655440000', 'Vision-Y Security Demo')
        ON CONFLICT (id) DO NOTHING;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vy_tenant') THEN
        INSERT INTO vy_tenant (id, org_id, name, address) VALUES 
        ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Main Campus', '123 Security Blvd, Tech City, TC 12345')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;