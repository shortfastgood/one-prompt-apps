# Plan: Video Resize Script (vresize.py)

TL;DR: Create scripts/video/vresize.py that resizes an entire video sequence (folder of image frames) to a target resolution. Auto-detects source dimensions from the first frame, defaults to Full HD (1920×1080), and supports both upscaling and downscaling using OpenCV's LANCZOS interpolation.

## Steps

1. Create scripts/video/vresize.py with:
Argument parsing: --source (mandatory, path to input video frame directory), --target (mandatory, output path), --size (optional, [width]x[height] format, defaults to 1920×1080)
Auto-detection of source dimensions from the first frame in the source directory
Resize all frames using OpenCV (cv2.INTER_LANCZOS4) for high-quality upscaling and downscaling
Error handling: print syntax help on illegal args and exit; human-readable messages for other errors
Relevant files

2. resize.py — reference for project style (argparse patterns, error handling, print messages, supported formats)
requirements.txt — already includes opencv-python and numpy
Verification

3. Run script with --help to verify syntax output
Test with a sample video sequence directory: python vresize.py --source ./frames --target ./resized_frames --size 1920x1080
Test without --size to verify default Full HD behavior
Test with invalid --size format to verify error message
Decisions

4. Uses OpenCV (already in requirements.txt) with LANCZOS interpolation, matching the quality approach in image/resize.py
Processes all common image formats: .jpg, .jpeg, .png, .bmp, .tiff, .webp
Creates output directories as needed (parents=True, exist_ok=True)
Ready to implement. Shall I proceed?

**The plan should be corrected because the script should process also any video formats and not only images.**

# Plan: Video Resize Script (vresize.py) — Revised
TL;DR: Create scripts/video/vresize.py that resizes an entire video file (any supported format) to a target resolution. Auto-detects source dimensions from the video stream, defaults to Full HD (1920×1080), and supports both upscaling and downscaling using OpenCV's LANCZOS interpolation.

## Steps

1. Create scripts/video/vresize.py with:
Argument parsing: --source (mandatory, path to input video file), --target (mandatory, output path), --size (optional, [width]x[height] format, defaults to 1920×1080)
2. Auto-detection of source dimensions and FPS from the video stream using OpenCV VideoCapture
3. Resize all frames in real-time using OpenCV (cv2.INTER_LANCZOS4) for high-quality upscaling and downscaling
4. Write output video with matching codec/FPS, or let user specify via file extension
Error handling: print syntax help on illegal args and exit; human-readable messages for other errors
Relevant files

5. resize.py — reference for project style (argparse patterns, error handling, print messages)
requirements.txt — already includes opencv-python and numpy
Verification

6. Run script with --help to verify syntax output
7. Test with a sample video: python vresize.py --source ./input.mp4 --target ./output.mp4 --size 1920x1080
8. Test without --size to verify default Full HD behavior
9. Test with invalid --size format (e.g., abc) to verify error message
9. Test with non-existent source file to verify error handling
Decisions

11. Uses OpenCV VideoCapture / VideoWriter for reading and writing actual video files (not just image frames)
12. Supports all formats OpenCV can handle (MP4, AVI, MKV, MOV, etc.)
13. Preserves original FPS in the output
Creates output directories as needed (parents=True, exist_ok=True)

**Shall I proceed with this revised plan?**

**Start implementation**

