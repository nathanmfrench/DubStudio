Approaches:

new subtitle flow: 
I want to have a separate lambda function for burning the subtitles on, and for getting the SRT file. I want the user to enter in their information (source, target language, video etc) then send a request to get the SRT file (using AWS translate or some other external API then they can use that SRT file to edit on the UI to get the final information (The SubtitleStyle information).

Would you like me to start implementing this new flow? I can:
Create the new lambda function structure
Modify the frontend flow
Add the SRT editing interface
Update the subtitle preview system

approach 1)
Ah, that's a crucial detail! For social media sharing, you're absolutely right - the subtitles need to be burned into the video. In that case, let's revise the approach.

The simplest approach would be to enhance your current FFMPEG implementation since:
1. You already have it working
2. FFMPEG has robust subtitle styling options
3. No need to learn a new framework like AVFoundation

Here's the simplest path forward:

1. First, enhance your current FFMPEG subtitle burning command to support styling parameters. Your current command is:
```bash
ffmpeg -i input_video -vf "subtitles={translated_srt}:force_style='FontName=Arial,FontSize=24'" -c:a copy output_video
```

We can modify this to support more styling options using FFMPEG's subtitle filter parameters:
```bash
ffmpeg -i input_video -vf "subtitles={translated_srt}:force_style='FontName=Arial,FontSize=24,PrimaryColour=&HFFFFFF,BackColour=&H000000,Outline=1,Shadow=1,MarginV=20'" -c:a copy output_video
```

2. Add subtitle style parameters to your video processing request. Modify your existing types:
```typescript
interface ProcessVideoRequest {
  sourceLanguage: string;
  targetLanguages: string[];
  caption?: boolean;
  subtitleStyle?: {
    fontSize: number;        // e.g., 24
    fontColor: string;       // hex color
    backgroundColor: string; // hex color
    position: 'top' | 'bottom';
    outline: number;         // e.g., 1
    shadow: number;          // e.g., 1
  };
}
```

3. Update your subtitle lambda to use these parameters. Here's a simplified example:

```python
def build_subtitle_style(style_params):
    default_style = {
        'FontName': 'Arial',
        'FontSize': 24,
        'PrimaryColour': '&HFFFFFF',  # White
        'BackColour': '&H000000',     # Black
        'Outline': 1,
        'Shadow': 1,
        'MarginV': 20                 # Bottom margin
    }
    
    if style_params:
        if 'fontSize' in style_params:
            default_style['FontSize'] = style_params['fontSize']
        if 'fontColor' in style_params:
            # Convert hex to ASS color format
            default_style['PrimaryColour'] = f"&H{style_params['fontColor'].lstrip('#')}"
        if 'position' in style_params:
            default_style['MarginV'] = 20 if style_params['position'] == 'bottom' else 10
            
    style_str = ','.join([f"{k}={v}" for k, v in default_style.items()])
    return f"force_style='{style_str}'"

# In your subtitle burning function:
style_params = event.get('subtitleStyle', {})
style_string = build_subtitle_style(style_params)

subprocess.run([
    './ffmpeg', '-i', input_video,
    '-vf', f"subtitles={translated_srt}:{style_string}",
    '-c:a', 'copy',
    output_video
], check=True)
```

4. Add a simple preview UI in your frontend where users can:
- Choose font size (small, medium, large)
- Pick from a few preset colors
- Select top or bottom position

Would you like me to help you implement any of these specific changes? We can:
1. Modify your subtitle lambda to support the styling parameters
2. Create a simple UI component for subtitle customization
3. Update your API types and handlers to support the new parameters








1. **Client-Side Rendering (Recommended)**:
Instead of burning the subtitles into the video on the server-side, you could:
- Generate and store just the SRT/WebVTT subtitle files
- Send both the video and subtitle files to the client
- Use a video player component that supports custom subtitle styling (like Video.js or Plyr)
- Allow users to customize subtitle styles through CSS properties in real-time

Benefits:
- Real-time customization without re-processing the video
- Lower server costs (no video processing)
- Better user experience (instant style changes)
- Reduced storage needs (only store one video file)

2. **AVFoundation Approach**:
If you want to stick with server-side rendering, AVFoundation would indeed be a good choice since you're on macOS. You could:
- Use AVFoundation to compose video with customizable text layers
- Store subtitle style preferences in your database
- Create an API endpoint for users to update their subtitle preferences
- Process videos using AVFoundation's `AVMutableComposition` and `AVMutableVideoComposition`

3. **Enhanced FFMPEG Approach**:
You could also enhance your current FFMPEG implementation by:
- Using FFMPEG's advanced subtitle filters
- Creating a subtitle style configuration system
- Using ASS/SSA subtitle format which supports rich styling

Here's what I recommend:

1. First, move to client-side rendering as the default approach. This gives users immediate control over styles without server processing.

2. Create a subtitle preferences schema in your database:
```typescript
interface SubtitlePreferences {
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  backgroundColor: string;
  position: {
    vertical: 'top' | 'middle' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  opacity: number;
}
```

3. Modify your subtitle generation lambda to:
- Only generate and store the SRT/WebVTT files
- Skip the FFMPEG burning step
- Return both video URL and subtitle URL to the client

4. Add a video player component in your frontend that supports WebVTT with custom styling:
```typescript
interface VideoPlayerProps {
  videoUrl: string;
  subtitleUrl: string;
  subtitlePreferences: SubtitlePreferences;
}
```

5. Create a subtitle customization UI component that lets users:
- Choose font family, size, and color
- Set position and alignment
- Adjust background opacity
- Preview changes in real-time

6. (Optional) For cases where server-side rendering is required (like social media sharing), create a separate endpoint that uses AVFoundation to render the video with the user's preferred subtitle styles.

Would you like me to help you implement any of these specific components? I can:
1. Help modify your lambda to skip subtitle burning and return subtitle files
2. Create a video player component with customizable subtitles
3. Design the subtitle preferences schema and API
4. Set up the AVFoundation-based rendering system


FINISHED STEPS:
We have updated the video.ts types file to include a SubtitleStyle interface.
we also updated the subtitle lambda event interface to match this change
