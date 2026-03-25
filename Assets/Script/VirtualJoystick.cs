using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

public class VirtualJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
{
    [Header("조이스틱 UI 연결")]
    public Image backgroundImage; 
    public Image joystickImage;   

    public Vector2 InputVector { get; private set; }

    private void Start()
    {
        if (backgroundImage == null) backgroundImage = GetComponent<Image>();
        if (joystickImage == null) joystickImage = transform.GetChild(0).GetComponent<Image>();

        RectTransform rect = backgroundImage.rectTransform;
        
        rect.anchorMin = new Vector2(0.5f, 0f);
        rect.anchorMax = new Vector2(0.5f, 0f);
        rect.pivot = new Vector2(0.5f, 0f);
        
        rect.anchoredPosition = new Vector2(0f, 60f); 
    }

    public void OnDrag(PointerEventData eventData)
    {
        Vector2 pos;
        if (RectTransformUtility.ScreenPointToLocalPointInRectangle(backgroundImage.rectTransform, eventData.position, eventData.pressEventCamera, out pos))
        {
            pos.x = (pos.x / (backgroundImage.rectTransform.sizeDelta.x / 2));
            pos.y = (pos.y / (backgroundImage.rectTransform.sizeDelta.y / 2));

            InputVector = new Vector2(pos.x, pos.y);
            InputVector = (InputVector.magnitude > 1.0f) ? InputVector.normalized : InputVector;

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
        InputVector = Vector2.zero;
        joystickImage.rectTransform.anchoredPosition = Vector2.zero;
    }
}