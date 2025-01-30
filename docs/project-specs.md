todo:
step 4 should be different depending on what the user selected in the first step. if they chose schedule, it should have options to schedule the post. if they chose dub or sub, it should have options to do those as well.

simplify page to just be upload video and source language and caption, instead of video select individually -> video preview with src language and the caption
i assume in production we don't want to use this aws cognito scope: aws.cognito.signin.user.admin

   callbackUrls: ['exp://localhost:19000/--/*'], // Update with your Expo callback URLs

production endpoint vs but I have a development environment. nbd but fix before prod


right now when I type in my username "nathan" into the email field in the login page and enter my password it works

sign up page broken because of email vs username "username cannot be of email format since user pool is configured for email alias"

more file formats, ability to do multiple video processings at once (for multiple languages)

change watermark to False before production

we need to make a part where if someone JUST wants to put subtitles on their video, they can do that

we want to make it so users can choose if they want to have subtitles at all.

make it so s3 videos are deleted after 1 or 2 days since they are stored on instagram (think about this though)

check Blake anderson marketing section of his guide

yt videos on stripe integration, paywalling (in my yt history)

Rich Cottrell for small funding for targeted ad campaigns through google ads

make fire promotional template that creators can build on.

scheduler built in as a pro feature, more videos to higher tiers.

pricing is $1320 per 15000 videos approximately

ai writer included? mino recommendation. scheduler for sure, analytics for higher paying customers 

right now defaults to english to x language, but mabe in future start rolling out other languages. 

dub an existing video (thing in elevenlabs api where you can dub from source url) 

add number of speakers in the video so the user can select how many speakers there are 

remove watermark

drop background audio

highest resolution

time zone optimization for each rwgion, post scheduling

maybe make it so that you have to pay extra for the dashboards (these can be pricey with many users)

fix dashboards to look better

change components to make it prettier.

center elements to make prettier.

make sure accounts persist and are seen by all of the places they need to be seen (post to accounts list, etc)

make upload button actually do stuff, with nice loading animations for when its working in progress.


Here are all the components we've created:

### Core Components
1. **Button**
   - Variants: Primary (blue), Secondary (outlined), Text
   - Sizes: Small, Medium, Large
   - States: Normal, Loading, Disabled
   - Props: `title`, `variant`, `size`, `disabled`, `loading`, `fullWidth`

2. **TextInput**
   - Features: Label, Error state, Helper text
   - Icons: Left icon, Right icon (with optional press)
   - Special types: Password (with toggle), Email, Search
   - Props: `label`, `value`, `error`, `leftIcon`, `rightIcon`, `secureTextEntry`

3. **VideoThumbnail**
   - Features: 16:9 aspect ratio, Duration badge
   - Status indicators: Original, Processing, Dubbed, Error
   - Props: `title`, `thumbnailUrl`, `duration`, `status`

4. **ListItem**
   - Platform icons: TikTok, Instagram, YouTube, Facebook
   - Status indicators: Connected, Disconnected, Pending, Error
   - Language tag for connected accounts
   - Props: `platform`, `accountName`, `subtitle`, `status`, `language`

5. **Feedback**
   - Types: Success, Error, Info, Loading
   - Features: Icon, Message, Optional description
   - Props: `type`, `message`, `description`

6. **Modal**
   - Positions: Center, Bottom sheet
   - Sizes: Small, Medium, Large, Full
   - Features: Title, Close button, Safe area handling
   - Props: `visible`, `onClose`, `title`, `position`, `size`


maybe modify types (tags) to the accounts or something. Here's all of the components:

1. **Initial Setup**
   - Set up a new React Native project with TypeScript
   - Install and configure React Navigation (v6+)
   - Set up a state management solution (Redux Toolkit)
   - Configure environment and build settings

2. **Authentication Foundation**
   - Implement authentication infrastructure
   - Set up secure token storage
   - Create auth context/provider
   - Build login/register screens with form validation

3. **Navigation Structure**
   - Configure the navigation hierarchy:
     - Root navigator (Stack)
     - Auth stack (Modal presentation)
     - Bottom tab navigator
     - Nested stack navigators for each tab

4. **Core Components Development**
   - Build reusable UI components:
     - Custom buttons
     - Form inputs
     - Cards for accounts
     - Loading indicators
     - Video player component
     - Language selector
     - Status indicators

5. **Screen Implementation (in order)**
   - Upload Screen:
     - Video picker integration
     - Upload functionality
     - Progress tracking
     - Preview capability
   - Accounts Screen:
     - Account list view
     - Connection flow
     - Platform integration
   - Profile/Dashboard:
     - Analytics display
     - Settings management
     - User profile

6. **Data Layer**
   - Set up API client
   - Implement data fetching hooks
   - Configure caching strategy
   - Error handling

7. **Video Processing**
   - Video upload handling
   - Compression if needed
   - Progress tracking
   - Server communication

8. **Platform Integration**
   - Social media API integration
   - OAuth implementations
   - Platform-specific handlers

9. **Analytics & Monitoring**
   - Performance tracking
   - Error reporting
   - Usage analytics
   - User behavior tracking

10. **Polish & Optimization**
    - Loading states
    - Error boundaries
    - Deep linking
    - Offline support
    - Performance optimization
