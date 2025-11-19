-- =====================================================
-- MULTIPLAYER CHALLENGES MIGRATION (Feature 22)
-- Real-time competitive challenge system with voting
-- =====================================================

-- =====================================================
-- CHALLENGES TABLE
-- =====================================================

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',

  -- Requirements as JSON array
  requirements JSONB DEFAULT '[]'::jsonb,

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  voting_end_time TIMESTAMPTZ NOT NULL,

  -- Status lifecycle: pending -> active -> voting -> completed/expired
  status TEXT NOT NULL DEFAULT 'pending',

  -- Limits
  max_participants INTEGER,

  -- Visibility
  is_public BOOLEAN DEFAULT true,

  -- Rewards
  points_reward INTEGER NOT NULL DEFAULT 100,
  participation_points INTEGER NOT NULL DEFAULT 10,

  -- Tags
  tags TEXT[] DEFAULT '{}'::text[],

  -- Denormalized counters (updated by triggers)
  participant_count INTEGER DEFAULT 0,
  submission_count INTEGER DEFAULT 0,

  -- Winner (set after voting ends)
  winner_submission_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_challenge_type CHECK (challenge_type IN (
    'style_theme', 'color_challenge', 'budget_limit', 'category_specific',
    'seasonal', 'occasion', 'mix_match', 'monochrome', 'pattern_mix', 'trend_recreation'
  )),
  CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'voting', 'completed', 'expired')),
  CONSTRAINT valid_times CHECK (
    start_time < end_time AND
    end_time < voting_end_time
  ),
  CONSTRAINT positive_rewards CHECK (points_reward > 0 AND participation_points >= 0)
);

-- Indexes
CREATE INDEX idx_challenges_creator ON challenges(creator_id);
CREATE INDEX idx_challenges_status ON challenges(status, start_time DESC);
CREATE INDEX idx_challenges_public ON challenges(is_public, status) WHERE is_public = true;
CREATE INDEX idx_challenges_active ON challenges(status, end_time) WHERE status IN ('active', 'voting');
CREATE INDEX idx_challenges_tags ON challenges USING GIN(tags);

-- =====================================================
-- CHALLENGE PARTICIPANTS (Many-to-Many)
-- =====================================================

CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  joined_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_participant UNIQUE (challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_participants_challenge ON challenge_participants(challenge_id);
CREATE INDEX idx_participants_user ON challenge_participants(user_id);

-- =====================================================
-- CHALLENGE SUBMISSIONS
-- =====================================================

CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Outfit composition (must match clothing_items from user's closet)
  top_id UUID NOT NULL,
  bottom_id UUID NOT NULL,
  shoes_id UUID NOT NULL,
  accessories_ids UUID[] DEFAULT '{}'::uuid[],

  -- Optional caption
  caption TEXT,

  -- Voting results (denormalized for performance)
  votes_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,

  -- Winner status
  is_winner BOOLEAN DEFAULT false,
  winner_badge TEXT,

  submitted_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_submission UNIQUE (challenge_id, user_id),
  CONSTRAINT caption_length CHECK (char_length(caption) <= 200)
);

-- Indexes
CREATE INDEX idx_submissions_challenge ON challenge_submissions(challenge_id, score DESC);
CREATE INDEX idx_submissions_user ON challenge_submissions(user_id);
CREATE INDEX idx_submissions_winners ON challenge_submissions(challenge_id) WHERE is_winner = true;

-- =====================================================
-- CHALLENGE VOTES
-- =====================================================

CREATE TABLE challenge_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,

  voted_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_vote UNIQUE (submission_id, user_id),
  CONSTRAINT one_vote_per_challenge UNIQUE (challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_votes_submission ON challenge_votes(submission_id);
CREATE INDEX idx_votes_user ON challenge_votes(user_id);
CREATE INDEX idx_votes_challenge ON challenge_votes(challenge_id);

-- =====================================================
-- USER CHALLENGE STATS (Leaderboard)
-- =====================================================

CREATE TABLE user_challenge_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  total_points INTEGER DEFAULT 0,
  challenges_won INTEGER DEFAULT 0,
  challenges_participated INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  votes_received INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,

  -- Ranking (updated periodically by cron or trigger)
  global_rank INTEGER,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stats_points ON user_challenge_stats(total_points DESC);
CREATE INDEX idx_stats_wins ON user_challenge_stats(challenges_won DESC);
CREATE INDEX idx_stats_rank ON user_challenge_stats(global_rank) WHERE global_rank IS NOT NULL;

-- =====================================================
-- CHALLENGE ACHIEVEMENTS
-- =====================================================

CREATE TABLE challenge_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  achievement_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  points_value INTEGER NOT NULL DEFAULT 0,
  requirement INTEGER NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_achievement_key UNIQUE (achievement_key)
);

-- Pre-populate achievements
INSERT INTO challenge_achievements (achievement_key, name, description, icon, badge_color, points_value, requirement) VALUES
  ('first_win', 'Primera Victoria', 'Ganaste tu primer desafío', 'emoji_events', '#FFD700', 50, 1),
  ('hat_trick', 'Hat Trick', 'Ganaste 3 desafíos seguidos', 'workspace_premium', '#FF6B6B', 200, 3),
  ('participation_award', 'Participación Activa', 'Participaste en 10+ desafíos', 'military_tech', '#4ECDC4', 100, 10),
  ('fashionista', 'Fashionista', 'Recibiste 100+ votos', 'star', '#95E1D3', 150, 100),
  ('trendsetter', 'Trendsetter', 'Ganaste 5+ desafíos', 'auto_awesome', '#F38181', 250, 5),
  ('community_champion', 'Champion de la Comunidad', 'Participaste en 50+ desafíos', 'sports_score', '#AA96DA', 300, 50);

-- =====================================================
-- USER ACHIEVEMENTS (Many-to-Many)
-- =====================================================

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES challenge_achievements(id) ON DELETE CASCADE,

  progress INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ,

  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Indexes
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at) WHERE unlocked_at IS NOT NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update challenge participant count
CREATE OR REPLACE FUNCTION update_challenge_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenges
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenges
    SET participant_count = participant_count - 1,
        updated_at = NOW()
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_challenge_participant_count
  AFTER INSERT OR DELETE ON challenge_participants
  FOR EACH ROW EXECUTE FUNCTION update_challenge_participant_count();

-- Update challenge submission count
CREATE OR REPLACE FUNCTION update_challenge_submission_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenges
    SET submission_count = submission_count + 1,
        updated_at = NOW()
    WHERE id = NEW.challenge_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenges
    SET submission_count = submission_count - 1,
        updated_at = NOW()
    WHERE id = OLD.challenge_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_challenge_submission_count
  AFTER INSERT OR DELETE ON challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION update_challenge_submission_count();

-- Update submission votes count (real-time!)
CREATE OR REPLACE FUNCTION update_submission_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_submissions
    SET votes_count = votes_count + 1,
        score = votes_count + 1
    WHERE id = NEW.submission_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenge_submissions
    SET votes_count = votes_count - 1,
        score = votes_count - 1
    WHERE id = OLD.submission_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_submission_votes
  AFTER INSERT OR DELETE ON challenge_votes
  FOR EACH ROW EXECUTE FUNCTION update_submission_votes();

-- Update user challenge stats when submission created
CREATE OR REPLACE FUNCTION update_user_stats_on_submission()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_challenge_stats (user_id, submissions_count, challenges_participated)
  VALUES (NEW.user_id, 1, 1)
  ON CONFLICT (user_id)
  DO UPDATE SET
    submissions_count = user_challenge_stats.submissions_count + 1,
    challenges_participated = user_challenge_stats.challenges_participated + 1,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats_on_submission
  AFTER INSERT ON challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_submission();

-- Update user stats when receiving votes
CREATE OR REPLACE FUNCTION update_user_stats_on_vote()
RETURNS TRIGGER AS $$
DECLARE
  submission_user_id UUID;
BEGIN
  -- Get the user_id of the submission owner
  SELECT user_id INTO submission_user_id
  FROM challenge_submissions
  WHERE id = NEW.submission_id;

  IF TG_OP = 'INSERT' THEN
    UPDATE user_challenge_stats
    SET votes_received = votes_received + 1,
        updated_at = NOW()
    WHERE user_id = submission_user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_challenge_stats
    SET votes_received = votes_received - 1,
        updated_at = NOW()
    WHERE user_id = submission_user_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_stats_on_vote
  AFTER INSERT OR DELETE ON challenge_votes
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_vote();

-- Update winner and award points when challenge completes
CREATE OR REPLACE FUNCTION finalize_challenge()
RETURNS TRIGGER AS $$
DECLARE
  winner_user_id UUID;
  winner_sub_id UUID;
BEGIN
  -- Only process when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status = 'voting' THEN

    -- Find winner (highest score)
    SELECT id, user_id INTO winner_sub_id, winner_user_id
    FROM challenge_submissions
    WHERE challenge_id = NEW.id
    ORDER BY score DESC, submitted_at ASC
    LIMIT 1;

    IF winner_sub_id IS NOT NULL THEN
      -- Mark submission as winner
      UPDATE challenge_submissions
      SET is_winner = true,
          winner_badge = '🏆'
      WHERE id = winner_sub_id;

      -- Update challenge with winner
      UPDATE challenges
      SET winner_submission_id = winner_sub_id
      WHERE id = NEW.id;

      -- Award points to winner
      UPDATE user_challenge_stats
      SET total_points = total_points + NEW.points_reward,
          challenges_won = challenges_won + 1,
          updated_at = NOW()
      WHERE user_id = winner_user_id;

      -- Award participation points to all participants
      UPDATE user_challenge_stats us
      SET total_points = us.total_points + NEW.participation_points,
          updated_at = NOW()
      WHERE user_id IN (
        SELECT user_id
        FROM challenge_submissions
        WHERE challenge_id = NEW.id AND user_id != winner_user_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_finalize_challenge
  AFTER UPDATE ON challenges
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status = 'voting')
  EXECUTE FUNCTION finalize_challenge();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Challenges: Public challenges visible to all, private only to participants
CREATE POLICY "Public challenges visible to all"
  ON challenges FOR SELECT
  USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their challenges"
  ON challenges FOR UPDATE
  USING (auth.uid() = creator_id);

-- Participants: Anyone can join public challenges
CREATE POLICY "Anyone can view participants"
  ON challenge_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join challenges"
  ON challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave challenges"
  ON challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Submissions: Visible to all for public challenges
CREATE POLICY "Submissions visible for public challenges"
  ON challenge_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_id
      AND (challenges.is_public = true OR challenges.creator_id = auth.uid())
    )
  );

CREATE POLICY "Participants can submit"
  ON challenge_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM challenge_participants
      WHERE challenge_id = challenge_submissions.challenge_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their submissions"
  ON challenge_submissions FOR UPDATE
  USING (auth.uid() = user_id);

-- Votes: Anyone can vote on public challenge submissions
CREATE POLICY "Votes visible to all"
  ON challenge_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote"
  ON challenge_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM challenges
      WHERE challenges.id = challenge_id
      AND challenges.status = 'voting'
    )
  );

CREATE POLICY "Users can delete their votes"
  ON challenge_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Stats: Visible to all (leaderboard)
CREATE POLICY "Stats visible to all"
  ON user_challenge_stats FOR SELECT
  USING (true);

CREATE POLICY "Stats auto-created and updated by triggers"
  ON user_challenge_stats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Stats can be updated"
  ON user_challenge_stats FOR UPDATE
  USING (true);

-- Achievements: Visible to all
CREATE POLICY "Achievements visible to all"
  ON challenge_achievements FOR SELECT
  USING (true);

CREATE POLICY "User achievements visible to all"
  ON user_achievements FOR SELECT
  USING (true);

-- =====================================================
-- REAL-TIME PUBLICATION
-- Enable real-time for voting and submissions
-- =====================================================

-- Drop existing publication if exists
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication with all tables that need real-time
CREATE PUBLICATION supabase_realtime FOR TABLE
  challenges,
  challenge_submissions,
  challenge_votes,
  user_challenge_stats;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to determine challenge winner and finalize
CREATE OR REPLACE FUNCTION complete_challenge(p_challenge_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE challenges
  SET status = 'completed',
      updated_at = NOW()
  WHERE id = p_challenge_id
    AND status = 'voting'
    AND voting_end_time < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update challenge statuses (call from cron or edge function)
CREATE OR REPLACE FUNCTION update_challenge_statuses()
RETURNS void AS $$
BEGIN
  -- Move pending to active
  UPDATE challenges
  SET status = 'active',
      updated_at = NOW()
  WHERE status = 'pending'
    AND start_time <= NOW();

  -- Move active to voting
  UPDATE challenges
  SET status = 'voting',
      updated_at = NOW()
  WHERE status = 'active'
    AND end_time <= NOW();

  -- Move voting to completed
  UPDATE challenges
  SET status = 'completed',
      updated_at = NOW()
  WHERE status = 'voting'
    AND voting_end_time <= NOW();

  -- Move old pending to expired
  UPDATE challenges
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND end_time < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE challenges IS 'Competitive fashion challenges with lifecycle management';
COMMENT ON TABLE challenge_submissions IS 'User outfit submissions for challenges with voting support';
COMMENT ON TABLE challenge_votes IS 'Real-time voting system with one vote per user per challenge';
COMMENT ON TABLE user_challenge_stats IS 'Denormalized leaderboard stats updated by triggers';
COMMENT ON FUNCTION update_challenge_statuses() IS 'Call periodically (cron) to auto-progress challenge statuses';
COMMENT ON FUNCTION complete_challenge(UUID) IS 'Manually complete a challenge and award points';
