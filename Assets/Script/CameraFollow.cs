using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("카메라 설정")]
    public Transform target; 
    
    public Vector3 offset;

    void Start()
    {
        offset = new Vector3(0f, 0f, -10f);
    }

    void LateUpdate()
    {
        if (target == null)
            return;

        Vector3 desiredPosition = target.position + offset;
        transform.position = desiredPosition;
    }

    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }
}