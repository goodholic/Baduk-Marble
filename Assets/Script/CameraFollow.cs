using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    [Header("카메라 설정")]
    public Transform target; 
    
    public Vector3 offset;
    public float smoothSpeed = 10f; // 추가됨: 카메라가 대상을 부드럽게 따라가는 속도

    void Start()
    {
        offset = new Vector3(0f, 0f, -10f);
    }

    void LateUpdate()
    {
        if (target == null)
            return;

        Vector3 desiredPosition = target.position + offset;
        
        // 변경됨: 단순히 위치를 강제로 맞추지 않고 Lerp를 통해 부드럽게 이동하여 화면 흔들림 방지
        transform.position = Vector3.Lerp(transform.position, desiredPosition, Time.deltaTime * smoothSpeed);
    }

    public void SetTarget(Transform newTarget)
    {
        target = newTarget;
    }
}