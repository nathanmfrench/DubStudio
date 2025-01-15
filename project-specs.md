todo:
change components to make it prettier.
center elements to make prettier.

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