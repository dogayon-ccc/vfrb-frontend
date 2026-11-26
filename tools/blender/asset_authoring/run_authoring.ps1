<#
VFRB Scrub Top Pilot 01 runner (Windows PowerShell).
Usage:  .\run_authoring.ps1 -Stage prepare -ModelsRoot C:\Users\Dave\vfrb-work\models-draco -Out C:\Users\Dave\vfrb-work\pilot01
Stages: test | prepare | render | build | export | verify | all-after-assign
Originals are never written to; all output goes under -Out.
#>
param(
  [Parameter(Mandatory)][ValidateSet('test','prepare','render','build','export','verify','all-after-assign')][string]$Stage,
  [string]$ModelsRoot = '',
  [string]$Out = "$PSScriptRoot\..\..\..\pilot01_out",
  [string]$Blender = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe',
  [switch]$ConfirmRegions,
  [switch]$ConfirmHandedness
)
$ErrorActionPreference = 'Stop'
$Entry  = Join-Path $PSScriptRoot 'blender_entry.py'
$Config = Join-Path $PSScriptRoot 'config\scrub_top_pilot_01.json'
$Out    = [IO.Path]::GetFullPath($Out)
$Prep   = Join-Path $Out 'blend\scrub_top_pilot01_prepared.blend'
$Auth   = Join-Path $Out 'blend\scrub_top_pilot01_authored.blend'
$Glb    = Join-Path $Out 'glb\scrub-top-pilot01.glb'

function Run-Blender([string[]]$StageArgs) {
  if (-not (Test-Path $Blender)) { throw "Blender not found: $Blender" }
  & $Blender --background --factory-startup --python $Entry -- @StageArgs
  if ($LASTEXITCODE -ne 0) { throw "Blender stage failed (exit $LASTEXITCODE)" }
}

switch ($Stage) {
  'test' { Push-Location $PSScriptRoot; python -m unittest discover -s tests; Pop-Location }
  'prepare' {
    if (-not $ModelsRoot) { throw '-ModelsRoot is required (folder that contains garments\scrub-top-men-short.glb, already unzipped)' }
    $src = Join-Path $ModelsRoot 'garments\scrub-top-men-short.glb'
    Run-Blender @('prepare','--config',$Config,'--out',$Out,'--source',$src)
    Run-Blender @('render','--config',$Config,'--out',$Out,'--blend',$Prep,'--tag','prepared')
    Write-Host "`nNEXT: open $Prep in Blender, assign faces to region slots (see README step 3), save, then run -Stage build."
  }
  'render' { Run-Blender @('render','--config',$Config,'--out',$Out,'--blend',$Prep,'--tag','review') }
  'build' {
    $a = @('build','--config',$Config,'--out',$Out,'--blend',$Prep)
    if ($ConfirmRegions)    { $a += '--confirm-regions' }
    if ($ConfirmHandedness) { $a += '--confirm-handedness' }
    Run-Blender $a
    Run-Blender @('render','--config',$Config,'--out',$Out,'--blend',$Auth,'--tag','authored')
  }
  'export' { Run-Blender @('export','--config',$Config,'--out',$Out,'--blend',$Auth) }
  'verify' { Run-Blender @('verify','--config',$Config,'--out',$Out,'--glb',$Glb) }
  'all-after-assign' {
    & $PSCommandPath -Stage build -Out $Out -Blender $Blender -ConfirmRegions:$ConfirmRegions -ConfirmHandedness:$ConfirmHandedness
    & $PSCommandPath -Stage export -Out $Out -Blender $Blender
    & $PSCommandPath -Stage verify -Out $Out -Blender $Blender
  }
}
