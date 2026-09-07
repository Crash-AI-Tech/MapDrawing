-- Read-only. Event counts are not unique people or a user-level funnel.
SELECT count(*) AS accounts, sum(email_verified=1) AS verified_accounts,
  sum(created_at >= unixepoch()-30*86400) AS new_accounts_30d FROM users;
SELECT day, event, platform, channel, count FROM product_counters
  WHERE day >= date('now','-30 days') ORDER BY day DESC,event,platform,channel;
SELECT day, count(DISTINCT user_id) AS authenticated_active,
  count(DISTINCT CASE WHEN event='create' THEN user_id END) AS creators
  FROM product_activity WHERE day >= date('now','-30 days') GROUP BY day ORDER BY day DESC;
-- Seven-day return among first recorded creators with a full seven-day window.
WITH first_creation AS (
  SELECT user_id, min(day) AS first_day FROM product_activity WHERE event='create' GROUP BY user_id
), eligible AS (
  SELECT * FROM first_creation WHERE first_day <= date('now','-7 days')
)
SELECT count(*) AS eligible_creators,
  sum(EXISTS(SELECT 1 FROM product_activity a WHERE a.user_id=e.user_id AND a.day=date(e.first_day,'+7 days'))) AS returned_on_day_7
FROM eligible e;
