using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
{
    [Header("조이스틱 UI 연결")]
    public Image backgroundImage; // 조이스틱 배경 동그라미
    public Image joystickImage;   // 움직이는 핸들 동그라미

    public Vector2 InputVector { get; private set; }

    private void Start()
    {
        if (backgroundImage == null) backgroundImage = GetComponent<Image>();
        if (joystickImage == null) joystickImage = transform.GetChild(0).GetComponent<Image>();
    }

    public void OnDrag(PointerEventData eventData)
    {
        Vector2 pos;
        if (RectTransformUtility.ScreenPointToLocalPointInRectangle(backgroundImage.rectTransform, eventData.position, eventData.pressEventCamera, out pos))
        {
            // 좌표 정규화 (-1 ~ 1)
            pos.x = (pos.x / (backgroundImage.rectTransform.sizeDelta.x / 2));
            pos.y = (pos.y / (backgroundImage.rectTransform.sizeDelta.y / 2));

            InputVector = new Vector2(pos.x, pos.y);
            InputVector = (InputVector.magnitude > 1.0f) ? InputVector.normalized : InputVector;

            // 핸들 이미지 이동
            joystickImage.rectTransform.anchoredPosition = new Vector2(
                InputVector.x * (backgroundImage.rectTransform.sizeDelta.x / 2),
                InputVector.y * (backgroundImage.rectTransform.sizeDelta.y / 2));
        }
    }

    public void OnPointerDown(PointerEventData eventData)
    {
        OnDrag(eventData);
    }

    public void OnPointerUp(PointerEventData eventData)
    {
        // 터치 종료 시 초기화
        InputVector = Vector2.zero;
        joystickImage.rectTransform.anchoredPosition = Vector2.zero;
    }
}