@echo off
echo Setting up the server environment...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python 3.8+ first.
    pause
    exit /b 1
)

REM Create and activate a virtual environment
echo Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo Failed to create virtual environment.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
pip install numpy==1.26.4
if %errorlevel% neq 0 (
    echo Failed to install numpy.
    pause
    exit /b 1
)

pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
if %errorlevel% neq 0 (
    echo Failed to install PyTorch. Trying CPU version...
    pip install torch torchvision torchaudio
)

pip install onnxruntime fastapi uvicorn transformers pillow scikit-image transparent-background rembg opencv-python-headless python-multipart requests
if %errorlevel% neq 0 (
    echo Failed to install main dependencies.
    pause
    exit /b 1
)

pip install carvekit
if %errorlevel% neq 0 (
    echo Warning: Failed to install carvekit. Continuing...
)

REM Install additional requirements if there's a requirements.txt file
if exist requirements.txt (
    pip install -r requirements.txt
)

REM Create ormbg directory and download model
echo Creating ORMBG directory...
if not exist "%USERPROFILE%\.ormbg" mkdir "%USERPROFILE%\.ormbg"

echo Downloading the ORMBG model...
powershell -Command "Invoke-WebRequest -Uri 'https://huggingface.co/schirrmacher/ormbg/resolve/main/models/ormbg.pth' -OutFile '%USERPROFILE%\.ormbg\ormbg.pth'"

echo Setup completed successfully!
pause 