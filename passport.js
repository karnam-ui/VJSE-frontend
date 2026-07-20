const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

module.exports = function(prisma) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
        callbackURL: 'http://localhost:3000/auth/google/callback',
      },
      async function(accessToken, refreshToken, profile, done) {
        try {
          if (!profile.emails || profile.emails.length === 0) {
            return done(new Error('No email found in Google profile'), null);
          }

          const email = profile.emails[0].value;
          const lowerEmail = email.toLowerCase();

          // 1. Check if user already has their googleId linked
          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (user) {
            return done(null, user);
          }

          // 2. Otherwise, check if user exists by email but isn't linked to Google yet
          user = await prisma.user.findUnique({
            where: { email: lowerEmail },
          });

          if (user) {
            // Link the googleId to the existing account
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId: profile.id },
            });
            console.log(`🔗 Linked Google authentication to existing user: ${user.email}`);
            return done(null, user);
          }

          // 3. Auto-resolve role if registering a new user based on email constraints
          let resolvedRole = 'Mentor'; // Default role for non-institution emails
          
          if (
            lowerEmail === 'karnamsuhaas@gmail.com' ||
            lowerEmail === 'shubham202098@gmail.com' ||
            lowerEmail === 'akshaynerella9@gmail.com'
          ) {
            resolvedRole = 'Admin';
          } else if (lowerEmail === 'founder@vnrvjiet.in') {
            resolvedRole = 'Founder';
          } else if (lowerEmail.endsWith('@vnrvjiet.in')) {
            const prefix = lowerEmail.split('@')[0];
            if (prefix.startsWith('volunteer')) {
              resolvedRole = 'Volunteer';
            } else {
              resolvedRole = 'Student';
            }
          }

          // 4. Create the new user record in SQLCipher SQLite DB
          user = await prisma.user.create({
            data: {
              email: lowerEmail,
              name: profile.displayName || 'VJ User',
              role: resolvedRole,
              googleId: profile.id,
              // Password is left null/empty since authentication is handled by Google
            },
          });

          console.log(`🆕 Auto-registered new Google user: ${user.name} (${user.role})`);
          return done(null, user);
        } catch (error) {
          console.error('Error during Google authentication strategy:', error);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user into the session store
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user out of the session store
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
