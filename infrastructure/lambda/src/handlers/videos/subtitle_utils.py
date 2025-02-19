import subprocess
from typing import Dict, Optional, Tuple

class SubtitleStyle:
    def __init__(self, style_params: Optional[Dict] = None, video_path: str = None):
        self.style_params = style_params or {}
        self.video_dimensions = self._get_video_dimensions(video_path) if video_path else (1920, 1080)  # default to 1080p
    
    def _get_video_dimensions(self, video_path: str) -> Tuple[int, int]:
        """Get video dimensions using ffprobe"""
        try:
            cmd = [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height',
                '-of', 'csv=p=0', video_path
            ]
            output = subprocess.check_output(cmd).decode('utf-8').strip().split(',')
            return tuple(map(int, output))
        except Exception as e:
            print(f"Error getting video dimensions: {e}")
            return (1920, 1080)  # fallback to 1080p
    
    def _convert_color(self, color: str) -> str:
        """Convert hex color (#RRGGBB) to ASS format (&HBBGGRR)"""
        if not color or not color.startswith('#'):
            return '&HFFFFFF'  # Default white
        
        # Remove # and convert to BGR
        rgb = color[1:]
        bgr = rgb[4:6] + rgb[2:4] + rgb[0:2]
        return f"&H{bgr}"
    
    def _calculate_margins(self) -> Tuple[int, int]:
        """Calculate margins based on position percentages"""
        position = self.style_params.get('position', {'x': 50, 'y': 90})  # Default to bottom-center
        video_width, video_height = self.video_dimensions
        
        # Convert percentages to pixels
        margin_l = int((position.get('x', 50) / 100) * video_width)
        margin_v = int((position.get('y', 90) / 100) * video_height)
        
        return margin_l, margin_v
    
    def _get_alignment(self) -> int:
        """
        Get alignment value (1-9) based on position
        Alignment points:
        7 8 9 (top)
        4 5 6 (middle)
        1 2 3 (bottom)
        """
        position = self.style_params.get('position', {'x': 50, 'y': 90})
        x = position.get('x', 50)
        y = position.get('y', 90)
        
        # Determine vertical position (top, middle, bottom)
        if y < 33:
            row = 7  # top
        elif y < 66:
            row = 4  # middle
        else:
            row = 1  # bottom
            
        # Determine horizontal position (left, center, right)
        if x < 33:
            col = 0  # left
        elif x < 66:
            col = 1  # center
        else:
            col = 2  # right
            
        return row + col
    
    def get_ffmpeg_style(self) -> str:
        """Convert style parameters to FFMPEG subtitle filter options"""
        margin_l, margin_v = self._calculate_margins()
        
        style = {
            'FontName': self.style_params.get('fontType', 'Arial'),
            'FontSize': self.style_params.get('fontSize', 24),
            'PrimaryColour': self._convert_color(self.style_params.get('fontColor', '#FFFFFF')),
            'BackColour': self._convert_color(self.style_params.get('backgroundColor', '#000000')),
            'Outline': self.style_params.get('outline', 1),
            'MarginL': margin_l,
            'MarginV': margin_v,
            'Alignment': self._get_alignment()
        }
        
        # Handle background opacity
        if 'opacity' in self.style_params:
            opacity_hex = format(int(float(self.style_params['opacity']) * 255), '02x')
            bg_color = style['BackColour'][2:]  # Remove &H
            style['BackColour'] = f"&H{opacity_hex}{bg_color}"
        
        # Build the style string
        style_str = ','.join(f"{k}={v}" for k, v in style.items())
        return f"force_style='{style_str}'"

    def get_debug_info(self) -> Dict:
        """Return debug information about the current style settings"""
        margin_l, margin_v = self._calculate_margins()
        return {
            'video_dimensions': self.video_dimensions,
            'calculated_margins': {
                'left': margin_l,
                'vertical': margin_v
            },
            'alignment': self._get_alignment(),
            'applied_styles': self.get_ffmpeg_style()
        }