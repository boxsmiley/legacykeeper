require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../models/database');

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna',
  'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Alexander', 'Rachel', 'Frank', 'Catherine', 'Patrick', 'Carolyn', 'Raymond', 'Janet',
  'Jack', 'Ruth', 'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane',
  'Aaron', 'Virginia', 'Jose', 'Julie', 'Adam', 'Joyce', 'Henry', 'Victoria',
  'Nathan', 'Olivia', 'Douglas', 'Kelly', 'Zachary', 'Christina', 'Peter', 'Lauren',
  'Kyle', 'Joan', 'Walter', 'Evelyn', 'Ethan', 'Judith', 'Jeremy', 'Megan',
  'Harold', 'Cheryl', 'Keith', 'Andrea', 'Christian', 'Hannah', 'Roger', 'Jacqueline',
  'Noah', 'Martha', 'Gerald', 'Gloria', 'Carl', 'Teresa', 'Terry', 'Ann',
  'Sean', 'Sara', 'Austin', 'Madison', 'Arthur', 'Frances', 'Lawrence', 'Kathryn',
  'Jesse', 'Janice', 'Dylan', 'Jean', 'Bryan', 'Abigail', 'Joe', 'Alice'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell',
  'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher',
  'Vasquez', 'Simmons', 'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham',
  'Reynolds', 'Griffin', 'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant',
  'Herrera', 'Gibson', 'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray',
  'Ford', 'Castro', 'Marshall', 'Owens', 'Harrison', 'Fernandez', 'McDonald', 'Woods',
  'Washington', 'Kennedy', 'Wells', 'Vargas', 'Henry', 'Chen', 'Freeman', 'Webb',
  'Tucker', 'Guzman', 'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter'
];

async function generateTestUsers() {
  console.log('Starting test user generation...');

  const password = 'chilled_monkey_bra1ns!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const createdUsers = [];
  const errors = [];

  for (let i = 1; i <= 300; i++) {
    try {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = `testuser${i}@legacykeeper.test`;

      // Create user
      const user = await db.create('users.json', {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        PasswordHash: hashedPassword,
        PhoneNumber: `555-${String(1000 + i).padStart(4, '0')}`,
        MailingAddress: `${i} Test Street, Test City, TC ${String(10000 + i).padStart(5, '0')}`,
        DateOfBirth: new Date(1950 + Math.floor(Math.random() * 50), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
        Role: 'user',
        AccountStatus: 'active',
        ProfilePicture: null,
        EmergencyContact: null,
        SecurityQuestion: 'What is your favorite color?',
        SecurityAnswer: 'blue',
        PreferredLanguage: 'en',
        TimeZone: 'America/New_York',
        TwoFactorEnabled: false,
        CreatedBy: 'system'
      });

      createdUsers.push({
        id: user.UniqueId,
        email: email,
        name: `${firstName} ${lastName}`
      });

      if (i % 50 === 0) {
        console.log(`Created ${i} users...`);
      }
    } catch (error) {
      errors.push({ userNumber: i, error: error.message });
      console.error(`Error creating user ${i}:`, error.message);
    }
  }

  console.log('\n=== Test User Generation Complete ===');
  console.log(`Successfully created: ${createdUsers.length} users`);
  console.log(`Errors: ${errors.length}`);
  console.log(`\nAll users have the password: ${password}`);
  console.log(`\nSample users:`);
  console.log(createdUsers.slice(0, 10).map(u => `  - ${u.email} (${u.name})`).join('\n'));

  if (errors.length > 0) {
    console.log(`\nErrors encountered:`);
    console.log(errors.slice(0, 5).map(e => `  - User ${e.userNumber}: ${e.error}`).join('\n'));
  }

  process.exit(0);
}

// Run the script
generateTestUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
