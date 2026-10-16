param(
  [string]$Python = "python",
  [string]$OutDir = "dist"
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

& $Python -m pip install --upgrade pip
& $Python -m pip install -r requirements.txt pyinstaller

$apps = @(
  @{ File = "file_renamer.py"; Name = "FileRenamer" },
  @{ File = "duplicate_finder.py"; Name = "DuplicateFinder" },
  @{ File = "folder_organizer.py"; Name = "FolderOrganizer" },
  @{ File = "image_batch.py"; Name = "ImageBatch" },
  @{ File = "input_recorder.py"; Name = "InputRecorder" }
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

foreach ($app in $apps) {
  & $Python -m PyInstaller --noconfirm --clean --onefile --windowed `
    --name $app.Name --distpath $OutDir --workpath "build" --specpath "build" `
    --collect-submodules pynput $app.File
}

Write-Host "빌드 완료: $(Join-Path $PSScriptRoot $OutDir) 폴더의 .exe 파일을 실행하세요."
