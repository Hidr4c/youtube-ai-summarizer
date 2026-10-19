<#
.SYNOPSIS
    Git Candidate & Release Workflow CLI
.DESCRIPTION
    Automates the candidate branch lifecycle:
    - start <version>   : Creates candidate/v<version>, updates versions, commits init.
    - status            : Shows current candidate status, diff from main, and clean state.
    - finish [version]  : Runs quality gates, squashes candidate into main (1 commit), tags, and pushes.
.EXAMPLE
    .\scripts\git_workflow.ps1 start 1.3.1
    .\scripts\git_workflow.ps1 status
    .\scripts\git_workflow.ps1 finish 1.3.1
#>
param(
    [Parameter(Position=0, Mandatory=$true)]
    [ValidateSet("start", "status", "finish", "release")]
    [string]$Action,
    [Parameter(Position=1, Mandatory=$false)]
    [string]$Version = ""
)

$script = Join-Path $PSScriptRoot "git_workflow.js"
if ($Version) {
    node $script $Action $Version
} else {
    node $script $Action
}
