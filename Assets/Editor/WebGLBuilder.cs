using UnityEditor;
using UnityEngine;
using System.Linq;

public class WebGLBuilder
{
    public static void Build()
    {
        string[] scenes = EditorBuildSettings.scenes
            .Where(s => s.enabled)
            .Select(s => s.path)
            .ToArray();

        if (scenes.Length == 0)
        {
            scenes = new string[] { "Assets/Scenes/SampleScene.unity" };
        }

        BuildPlayerOptions opts = new BuildPlayerOptions();
        opts.scenes = scenes;
        opts.locationPathName = "public/Build";
        opts.target = BuildTarget.WebGL;
        opts.options = BuildOptions.None;

        var report = BuildPipeline.BuildPlayer(opts);
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("BUILD SUCCESS: " + report.summary.totalSize + " bytes");
        }
        else
        {
            Debug.LogError("BUILD FAILED: " + report.summary.result);
            EditorApplication.Exit(1);
        }
    }
}
