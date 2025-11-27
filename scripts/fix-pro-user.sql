-- Quick SQL script to manually set a user as Pro
-- Replace 'user_35s7pBPJQ70otwhwu5IoiC4RbCD' with the actual user ID

UPDATE "User" 
SET 
  "isPro" = true,
  "clerkPlanId" = 'cplan_35lmOqzm4DkZ9qKirzLMaU5cImq',
  "updatedAt" = NOW()
WHERE id = 'user_35s7pBPJQ70otwhwu5IoiC4RbCD';

-- Verify the update
SELECT id, email, "isPro", "clerkPlanId", "subscriptionId" 
FROM "User" 
WHERE id = 'user_35s7pBPJQ70otwhwu5IoiC4RbCD';

