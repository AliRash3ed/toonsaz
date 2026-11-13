$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voices = @()
foreach ($item in $synth.GetInstalledVoices()) {
  if (-not $item.Enabled) { continue }
  $info = $item.VoiceInfo
  $locale = $info.Culture.Name
  if (-not $locale) { $locale = $info.Culture.TwoLetterISOLanguageName }
  $voices += [pscustomobject]@{
    name = $info.Name
    locale = $locale
    language = $info.Culture.TwoLetterISOLanguageName
    gender = $info.Gender.ToString().ToLower()
    label = "$($info.Name) / $locale"
  }
}
$synth.Dispose()
ConvertTo-Json -InputObject @($voices) -Compress
