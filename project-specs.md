todo:
fix components page to make new large primary buitton, medium primary, small primary, secondary buttons, 
and fix disabled state.
maybe add more types (tags) to the accounts or something. Here's all of the components:

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